import type { Types } from "youtubei.js";

import { canonicalYoutubeThumbnailUrl } from "@/lib/serializeVideo";
import {
  feedVideoToVideoLike,
  formatYoutubeDurationSeconds,
} from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import type { SearchSortMode } from "@/lib/uploadedAtSort";
import type { VideoLikeForSummary } from "@/lib/youtubeTypes";
import {
  extractVideoIdFromUrl as extractVideoIdFromUrlImpl,
  isLikelyYouTubeUrl as isLikelyYouTubeUrlImpl,
  isValidYoutubeVideoId,
} from "@/lib/youtubeUrl";

export type { VideoLikeForSummary as Video } from "@/lib/youtubeTypes";

export { extractVideoIdFromUrlImpl as extractVideoIdFromUrl, isLikelyYouTubeUrlImpl as isLikelyYouTubeUrl };

function searchFiltersForSort(sortMode: SearchSortMode): Types.SearchFilters {
  if (sortMode === "newest") {
    return {
      type: "video",
      sort_by: "upload_date",
    };
  }
  return { type: "video" };
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
