import type { Types } from "youtubei.js";

import { canonicalYoutubeThumbnailUrl } from "@/lib/serializeVideo";
import {
  feedVideoToVideoLike,
  formatYoutubeDurationSeconds,
} from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import type { SearchSortMode } from "@/lib/uploadedAtSort";
import type {
  ChannelSearchResult,
  MixedSearchResults,
  VideoLikeForSummary,
} from "@/lib/youtubeTypes";
import {
  channelPageHrefFromToken as channelPageHrefFromTokenImpl,
  extractChannelRouteTokenFromUrl as extractChannelRouteTokenFromUrlImpl,
  extractVideoIdFromUrl as extractVideoIdFromUrlImpl,
  isLikelyYouTubeUrl as isLikelyYouTubeUrlImpl,
  isValidYoutubeVideoId,
} from "@/lib/youtubeUrl";

export type { VideoLikeForSummary as Video } from "@/lib/youtubeTypes";

export {
  channelPageHrefFromTokenImpl as channelPageHrefFromToken,
  extractChannelRouteTokenFromUrlImpl as extractChannelRouteTokenFromUrl,
  extractVideoIdFromUrlImpl as extractVideoIdFromUrl,
  isLikelyYouTubeUrlImpl as isLikelyYouTubeUrl,
};

function searchFiltersForSort(sortMode: SearchSortMode): Types.SearchFilters {
  if (sortMode === "newest") {
    return {
      type: "video",
      sort_by: "upload_date",
    };
  }
  return { type: "video" };
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toString?: () => string }).toString === "function"
  ) {
    const out = String((value as { toString: () => string }).toString()).trim();
    return out || undefined;
  }
  return undefined;
}

function normalizeThumbnailUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const withProtocol = value.startsWith("//") ? `https:${value}` : value;
  return canonicalYoutubeThumbnailUrl(withProtocol);
}

function channelResultFromNode(node: unknown): ChannelSearchResult | null {
  if (!node || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  const author = o.author as
    | {
        id?: string;
        name?: string;
        url?: string;
        thumbnails?: { url?: string }[];
        endpoint?: { payload?: { canonicalBaseUrl?: string } };
      }
    | undefined;
  const id =
    (typeof o.id === "string" && o.id) ||
    author?.id ||
    (o.endpoint as { payload?: { browseId?: string } } | undefined)?.payload
      ?.browseId;
  if (!id) return null;

  const title = author?.name?.trim() || text(o.short_byline) || "Channel";
  const rawStats = [
    text(o.subscriber_count),
    text(o.video_count),
    text(o.long_byline),
    text(o.short_byline),
  ].filter((value): value is string => Boolean(value));
  const subscriberText = rawStats.find((value) =>
    value.toLowerCase().includes("subscriber"),
  );
  const videoCountText = rawStats.find((value) =>
    value.toLowerCase().includes("video"),
  );
  const handle =
    rawStats.find((value) => value.startsWith("@")) ||
    author?.endpoint?.payload?.canonicalBaseUrl?.replace(/^\//, "");
  const channelUrl =
    author?.url ||
    (handle?.startsWith("@")
      ? `https://www.youtube.com/${handle}`
      : `https://www.youtube.com/channel/${id}`);
  const bestThumbnail =
    author?.thumbnails?.find((thumbnail) => thumbnail.url)?.url;

  return {
    id,
    title,
    handle,
    description: text(o.description_snippet),
    channelUrl,
    thumbnailUrl: normalizeThumbnailUrl(bestThumbnail),
    subscriberText,
    videoCountText,
  };
}

export async function searchChannels(
  query: string,
  limit = 4,
): Promise<ChannelSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const yt = await getInnertube();
    const search = await yt.search(q, { type: "channel" });
    const out: ChannelSearchResult[] = [];
    const seenChannelIds = new Set<string>();

    for (const channel of search.channels) {
      const mapped = channelResultFromNode(channel);
      if (mapped && !seenChannelIds.has(mapped.id)) {
        seenChannelIds.add(mapped.id);
        out.push(mapped);
      }
      if (out.length >= limit) break;
    }

    return out;
  } catch {
    return [];
  }
}

export async function searchVideos(
  query: string,
  limit = 24,
  sortMode: SearchSortMode = "relevance",
): Promise<VideoLikeForSummary[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const yt = await getInnertube();
    const filters = searchFiltersForSort(sortMode);
    let search = await yt.search(q, filters);
    const out: VideoLikeForSummary[] = [];
    const seenVideoIds = new Set<string>();

    while (out.length < limit) {
      for (const v of search.videos) {
        const mapped = feedVideoToVideoLike(v);
        if (mapped && !seenVideoIds.has(mapped.id)) {
          seenVideoIds.add(mapped.id);
          out.push(mapped);
        }
        if (out.length >= limit) break;
      }
      if (out.length >= limit) break;
      if (!search.has_continuation) break;
      search = await search.getContinuation();
    }

    return out.slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchMixedResults(
  query: string,
  limit = 24,
  sortMode: SearchSortMode = "relevance",
): Promise<MixedSearchResults> {
  const [channels, videos] = await Promise.all([
    searchChannels(query, 4),
    searchVideos(query, limit, sortMode),
  ]);
  return { channels, videos };
}

/** @deprecated Prefer getWatchVideoDetails for watch + oEmbed fallback */
export async function getVideoById(
  id: string,
): Promise<VideoLikeForSummary | null> {
  if (!id || !isValidYoutubeVideoId(id)) return null;
  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(id);
    const bi = info.basic_info;
    const live = Boolean(bi.is_live || bi.is_live_content);
    const thumbs = (bi.thumbnail ?? []).map((t) => ({ url: t.url }));
    return {
      id,
      title: bi.title,
      channelName:
        bi.channel?.name?.trim() || bi.author?.trim() || "Unknown channel",
      durationFormatted: live ? "LIVE" : formatYoutubeDurationSeconds(bi.duration),
      uploadedAt: info.primary_info?.relative_date?.toString()?.trim(),
      live,
      thumbnailUrls: thumbs
        .map((t) => {
          try {
            return canonicalYoutubeThumbnailUrl(t.url);
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    };
  } catch {
    return null;
  }
}
