import type { YT } from "youtubei.js";

import { canonicalYoutubeThumbnailUrl, preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import type { VideoLikeForSummary, WatchVideoDetails } from "@/lib/youtubeTypes";

type Thumbnailish = { url: string };

function collectThumbnailUrls(thumbs: Thumbnailish[] | undefined): string[] {
  if (!thumbs?.length) return [];
  const out: string[] = [];
  for (const t of thumbs) {
    if (!t?.url) continue;
    try {
      const c = canonicalYoutubeThumbnailUrl(t.url);
      if (!out.includes(c)) out.push(c);
    } catch {
      /* skip */
    }
  }
  return out;
}

function durationTextFromFeedEntry(v: {
  duration?: unknown;
}): string {
  const d = v.duration;
  if (
    d &&
    typeof d === "object" &&
    d !== null &&
    "text" in d &&
    typeof (d as { text: unknown }).text === "string"
  ) {
    return (d as { text: string }).text;
  }
  if (
    d &&
    typeof d === "object" &&
    d !== null &&
    typeof (d as { toString?: () => string }).toString === "function"
  ) {
    const s = (d as { toString: () => string }).toString();
    if (s) return s;
  }
  return "—";
}

function isLiveFeedEntry(v: object): boolean {
  return (
    "is_live" in v &&
    (v as { is_live?: boolean }).is_live === true
  );
}

/**
 * Maps a search-feed video node (Video, CompactVideo, GridVideo, …) into our summary shape.
 */
export function feedVideoToVideoLike(v: unknown): VideoLikeForSummary | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;

  const title =
    o.title &&
    typeof o.title === "object" &&
    o.title !== null &&
    typeof (o.title as { toString?: () => string }).toString === "function"
      ? String((o.title as { toString: () => string }).toString())
      : undefined;

  let channelName = "Unknown channel";
  const author = o.author;
  if (
    author &&
    typeof author === "object" &&
    author !== null &&
    typeof (author as { name?: string }).name === "string"
  ) {
    channelName = (author as { name: string }).name.trim() || channelName;
  }

  let uploadedAt: string | undefined;
  if (
    o.published &&
    typeof o.published === "object" &&
    o.published !== null &&
    typeof (o.published as { toString?: () => string }).toString === "function"
  ) {
    const p = String((o.published as { toString: () => string }).toString()).trim();
    if (p) uploadedAt = p;
  }

  const thumbs = o.thumbnails as Thumbnailish[] | undefined;
  let thumbnailUrls = collectThumbnailUrls(thumbs);
  const best =
    o.best_thumbnail &&
    typeof o.best_thumbnail === "object" &&
    o.best_thumbnail !== null &&
    typeof (o.best_thumbnail as { url?: string }).url === "string"
      ? (o.best_thumbnail as { url: string }).url
      : undefined;
  if (best) {
    try {
      const c = canonicalYoutubeThumbnailUrl(best);
      thumbnailUrls = [c, ...thumbnailUrls.filter((u) => u !== c)];
    } catch {
      /* ignore */
    }
  }

  const live = isLiveFeedEntry(o);
  const durationFormatted = live ? "LIVE" : durationTextFromFeedEntry(o);

  return {
    id,
    title,
    channelName,
    durationFormatted,
    uploadedAt,
    live,
    thumbnailUrls,
  };
}

export function formatYoutubeDurationSeconds(total: number | undefined): string {
  if (total == null || !Number.isFinite(total) || total < 0) return "—";
  const s = Math.floor(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function videoInfoToWatchDetails(
  info: YT.VideoInfo,
  id: string,
): WatchVideoDetails {
  const bi = info.basic_info;
  const live = Boolean(bi.is_live || bi.is_live_content);
  const title = bi.title?.trim() || "Video";
  const channel = bi.channel;
  const channelName = channel?.name?.trim() || bi.author?.trim() || "Unknown channel";
  const channelId = channel?.id;
  const channelUrl = channel?.url;

  const thumbList = collectThumbnailUrls(
    bi.thumbnail as Thumbnailish[] | undefined,
  );
  const uploadedAt =
    info.primary_info?.relative_date?.toString()?.trim() ||
    info.primary_info?.published?.toString()?.trim() ||
    undefined;

  const videoLike: VideoLikeForSummary = {
    id,
    title,
    channelName,
    durationFormatted: live ? "LIVE" : formatYoutubeDurationSeconds(bi.duration),
    uploadedAt,
    live,
    thumbnailUrls: thumbList,
  };

  const description =
    info.secondary_info?.description?.toString()?.trim() ||
    bi.short_description?.trim();

  return {
    id,
    title,
    channelName,
    channelId,
    channelUrl,
    uploadedAt,
    views: bi.view_count ?? 0,
    description: description || undefined,
    thumbnailUrl: preferredYoutubeThumbnailPath(id, videoLike),
    source: "youtubei.js",
  };
}
