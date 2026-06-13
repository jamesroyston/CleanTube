import { getCachedInnertubeVideoInfo } from "@/lib/innertubeVideoInfoCache";
import { preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import { cleanYtText, isRelativeDateText } from "@/lib/youtubeiAdapters";
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

  const title = cleanYtText(o.metadata?.title?.toString?.()) || "Video";
  const rows = o.metadata?.metadata?.metadata_rows ?? [];
  const channelName =
    cleanYtText(partText(rows[0]?.metadata_parts?.[0])) || "Unknown channel";

  // Collect metadata parts EXCEPT the channel-name part (row 0, part 0) so a
  // channel name (e.g. "...Daily", "Minecraft") can't be mistaken for a date.
  const metaParts: string[] = [];
  rows.forEach((row, rowIdx) => {
    (row.metadata_parts ?? []).forEach((part, partIdx) => {
      if (rowIdx === 0 && partIdx === 0) return;
      const t = partText(part);
      if (t) metaParts.push(t);
    });
  });

  const uploadedAt = metaParts.find((t) => isRelativeDateText(t)) || undefined;
  const durationFromMeta = metaParts.find((t) => DURATION_LIKE.test(t));
  const live = metaParts.some((t) => /\blive\b/i.test(t));
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
    const info = await getCachedInnertubeVideoInfo(videoId);
    if (!info) return [];
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
