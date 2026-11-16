import { YTNodes, type Types } from "youtubei.js";

import { canonicalYoutubeThumbnailUrl } from "@/lib/serializeVideo";

import {
  formatYoutubeDurationSeconds,
  isSearchShelfNode,
  isShortSearchNode,
  mapSearchFeedNode,
  searchShelfChildren,
} from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import {
  parseHumanUploadedAgeSeconds,
  type SearchSortMode,
} from "@/lib/uploadedAtSort";
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

/**
 * InnerTube has no "sort by upload date" key. `upload_date: "year"` is a filter,
 * so it hides anything older than a year — including the video YouTube ranks first.
 * Newest mode unions that recency page with an unfiltered page instead of replacing it.
 */
function searchFiltersForSort(sortMode: SearchSortMode): Types.SearchFilters {
  if (sortMode === "newest") return { upload_date: "year" };
  return {};
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

type SearchPage = {
  results?: Iterable<unknown>;
  videos?: Iterable<unknown>;
  memo?: { getType?: (type: unknown) => Iterable<unknown> };
  has_continuation?: boolean;
  getContinuation: () => Promise<SearchPage>;
};

function walkSearchNodes(node: unknown, depth = 0): unknown[] {
  if (!node || depth > 4) return [];
  if (isSearchShelfNode(node)) {
    const out: unknown[] = [];
    for (const child of searchShelfChildren(node)) {
      out.push(...walkSearchNodes(child, depth + 1));
    }
    return out;
  }
  return [node];
}

function pageNodesInVisualOrder(search: SearchPage): unknown[] {
  const ordered: unknown[] = [];
  try {
    for (const item of search.results ?? []) {
      ordered.push(...walkSearchNodes(item));
    }
  } catch {
    /* fall through to the memo list */
  }
  try {
    for (const video of search.videos ?? []) ordered.push(video);
  } catch {
    /* memo list is a supplement */
  }
  try {
    const lockups = search.memo?.getType?.(YTNodes.LockupView) ?? [];
    for (const lockup of lockups) ordered.push(lockup);
  } catch {
    /* lockup nodes are optional */
  }
  return ordered;
}

/**
 * YouTube's video filter drops movies, shorts, and shelf rows, and sometimes
 * the whole page. Walk the unfiltered result list in display order, keep
 * regular videos first, then shorts, so a hit YouTube shows is not discarded.
 */
function collectSearchVideos(search: SearchPage, limit: number): VideoLikeForSummary[] {
  const primary: VideoLikeForSummary[] = [];
  const shorts: VideoLikeForSummary[] = [];
  const seen = new Set<string>();

  const push = (node: unknown) => {
    const mapped = mapSearchFeedNode(node);
    if (!mapped || seen.has(mapped.id)) return;
    seen.add(mapped.id);
    if (isShortSearchNode(node) || mapped.durationFormatted === "SHORT") {
      shorts.push(mapped);
    } else {
      primary.push(mapped);
    }
  };

  for (const node of pageNodesInVisualOrder(search)) push(node);

  return [...primary, ...shorts].slice(0, limit);
}

async function collectSearchPages(
  search: SearchPage,
  limit: number,
): Promise<VideoLikeForSummary[]> {
  const out: VideoLikeForSummary[] = [];
  const seen = new Set<string>();
  let page = search;
  let guard = 0;

  while (out.length < limit && guard < 4) {
    guard += 1;
    for (const video of collectSearchVideos(page, limit)) {
      if (seen.has(video.id)) continue;
      seen.add(video.id);
      out.push(video);
      if (out.length >= limit) break;
    }
    if (out.length >= limit || !page.has_continuation) break;
    try {
      page = await page.getContinuation();
    } catch {
      break;
    }
  }

  return out.slice(0, limit);
}

function ageSeconds(video: VideoLikeForSummary): number {
  if (video.live) return -1;
  return parseHumanUploadedAgeSeconds(video.uploadedAt) ?? Number.MAX_SAFE_INTEGER;
}

function mergeNewestVideos(
  recent: VideoLikeForSummary[],
  relevance: VideoLikeForSummary[],
  limit: number,
): VideoLikeForSummary[] {
  const seen = new Set<string>();
  const merged: VideoLikeForSummary[] = [];
  for (const video of [...recent, ...relevance]) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    merged.push(video);
  }
  merged.sort((a, b) => ageSeconds(a) - ageSeconds(b));
  const top = relevance[0];
  if (top && !merged.slice(0, limit).some((video) => video.id === top.id)) {
    const without = merged.filter((video) => video.id !== top.id);
    without.splice(Math.min(limit - 1, without.length), 0, top);
    return without.slice(0, limit);
  }
  return merged.slice(0, limit);
}

export async function searchVideos(
  query: string,
  limit = 24,
  sortMode: SearchSortMode = "relevance",
): Promise<VideoLikeForSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const yt = await getInnertube();
  const capped = Math.min(Math.max(limit, 1), 50);
  const directPromise = isValidYoutubeVideoId(q)
    ? getVideoById(q).catch(() => null)
    : Promise.resolve(null);

  const loadPage = async (filters?: Types.SearchFilters) => {
    const search = (await yt.search(q, filters)) as SearchPage;
    return collectSearchPages(search, capped);
  };

  const relevancePromise = loadPage().catch((err: unknown) => {
    if (
      err instanceof Error &&
      /no contents found in search response/i.test(err.message)
    ) {
      return [] as VideoLikeForSummary[];
    }
    throw err;
  });
  const recentPromise =
    sortMode === "newest"
      ? loadPage(searchFiltersForSort("newest")).catch(
          () => [] as VideoLikeForSummary[],
        )
      : Promise.resolve(null);

  const [relevance, recent, direct] = await Promise.all([
    relevancePromise,
    recentPromise,
    directPromise,
  ]);

  let videos =
    recent != null
      ? mergeNewestVideos(recent, relevance, capped)
      : relevance;

  if (direct && !videos.some((video) => video.id === direct.id)) {
    videos = [direct, ...videos].slice(0, capped);
  }

  return videos.slice(0, capped);
}

export async function searchMixedResults(
  query: string,
  limit = 24,
  sortMode: SearchSortMode = "relevance",
): Promise<MixedSearchResults> {
  const [channels, videos] = await Promise.all([
    searchChannels(query, 1),
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
