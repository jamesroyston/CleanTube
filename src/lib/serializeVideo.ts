import type { Video } from "youtube-sr";

import type { VideoSummary } from "@/components/VideoSummary";

/** Grid / metadata thumbs: sddefault ≈ 640×360 (mqdefault is only ~320×180). */
const THUMB_VARIANT = "sddefault" as const;

/** Prefer `i.ytimg.com` so Next/Image only needs one remote host (not i3/i4…). */
export function canonicalYoutubeThumbnailUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("ytimg.com")) return url;
    u.hostname = "i.ytimg.com";
    return u.toString();
  } catch {
    return url;
  }
}

export function preferredYoutubeThumbnailPath(id: string, video?: Video): string {
  const raw =
    video?.thumbnail?.displayThumbnailURL(THUMB_VARIANT) ??
    `https://i.ytimg.com/vi/${id}/${THUMB_VARIANT}.jpg`;
  return canonicalYoutubeThumbnailUrl(raw);
}

export function toVideoSummary(video: Video): VideoSummary | null {
  const id = video.id;
  if (!id) return null;
  const thumbnailUrl = preferredYoutubeThumbnailPath(id, video);
  return {
    id,
    title: video.title?.trim() || "Untitled",
    thumbnailUrl,
    channelName: video.channel?.name?.trim() || "Unknown channel",
    durationFormatted: video.live ? "LIVE" : video.durationFormatted || "—",
    uploadedAt: video.uploadedAt,
    live: video.live,
  };
}

export function toVideoSummaries(videos: Video[]): VideoSummary[] {
  return videos.map(toVideoSummary).filter(Boolean) as VideoSummary[];
}
