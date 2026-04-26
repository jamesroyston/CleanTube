import { getInnertube } from "@/lib/youtubeiClient";
import { preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import type { VideoLikeForSummary } from "@/lib/youtubeTypes";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

const DURATION_LIKE = /\b\d+:\d{2}\b/;

type Lockupish = {
  type?: string;
  content_id?: string;
  content_type?: string;
  metadata?: {
    title?: { toString?: () => string };
    metadata?: {
      metadata_rows?: {
        metadata_parts?: { text?: { toString?: () => string } }[];
      }[];
    };
  };
};

function partText(
  p: { text?: { toString?: () => string } } | undefined,
): string | undefined {
  const t = p?.text?.toString?.().trim();
  return t || undefined;
}

/**
 * Maps a watch page `LockupView` (watch_next_feed) to `VideoLikeForSummary`.
 */
function lockupToVideoLike(item: unknown): VideoLikeForSummary | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Lockupish;
  if (o.type !== "LockupView") return null;
  const id = o.content_id;
  if (typeof id !== "string" || !isValidYoutubeVideoId(id)) return null;
  if (o.content_type && o.content_type !== "VIDEO") return null;

  const title = o.metadata?.title?.toString?.().trim() || "Video";
  const rows = o.metadata?.metadata?.metadata_rows ?? [];
  const channelName =
    rows[0]?.metadata_parts?.[0] != null
      ? partText(rows[0].metadata_parts[0]) || "Unknown channel"
      : "Unknown channel";

  const flatParts: string[] = [];
  for (const row of rows) {
    for (const part of row.metadata_parts ?? []) {
      const t = partText(part);
      if (t) flatParts.push(t);
    }
  }
  const uploadedAt =
    flatParts.find(
      (t) => /ago|yesterday|today|hour|min|day|week|month|year/i.test(t),
    ) || undefined;
  const durationFromMeta = flatParts.find((t) => DURATION_LIKE.test(t));
  const live = flatParts.some((t) => /live/i.test(t));
  const durationFormatted = live
    ? "LIVE"
    : durationFromMeta
      ? durationFromMeta.match(DURATION_LIKE)?.[0] ?? "—"
      : "—";

  return {
    id,
    title,
    channelName,
    durationFormatted: live ? "LIVE" : durationFormatted,
    uploadedAt,
    live,
    thumbnailUrls: [preferredYoutubeThumbnailPath(id)],
  };
}

/**
 * Returns related "watch next" videos from `getInfo().watch_next_feed` (YouTube's sidebar rail).
 */
export async function getWatchNextRelatedVideos(
  videoId: string,
): Promise<VideoLikeForSummary[]> {
  if (!isValidYoutubeVideoId(videoId)) return [];
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);
    const feed = info.watch_next_feed;
    if (!feed) return [];
    const list = Array.isArray(feed) ? feed : Object.values(feed);
    const out: VideoLikeForSummary[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const v = lockupToVideoLike(item);
      if (!v || seen.has(v.id)) continue;
      seen.add(v.id);
      if (v.id === videoId) continue;
      out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}
