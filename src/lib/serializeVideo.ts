import type { VideoLikeForSummary } from "@/lib/youtubeTypes";

import type { VideoSummary } from "@/components/VideoSummary";

/** Grid / metadata thumbs: sddefault ≈ 640×360 (mqdefault is only ~320×180). */
const THUMB_VARIANT = "sddefault" as const;

/** After the primary `sddefault`, try API URL then smaller / alternate ytimg assets. */
const THUMB_FALLBACK_VARIANTS = [
  "sddefault",
  "hqdefault",
  "mqdefault",
  "default",
  "maxresdefault",
] as const;

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

export function preferredYoutubeThumbnailPath(
  id: string,
  video?: VideoLikeForSummary,
): string {
  const fromApi = video?.thumbnailUrls?.[0];
  const raw =
    (fromApi && canonicalYoutubeThumbnailUrl(fromApi)) ||
    `https://i.ytimg.com/vi/${id}/${THUMB_VARIANT}.jpg`;
  return canonicalYoutubeThumbnailUrl(raw);
}

function pushUnique(out: string[], url: string) {
  if (!out.includes(url)) out.push(url);
}

/** Next/Image `remotePatterns` only allow this host; other URLs never advance the chain. */
function isNextAllowedThumbUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "i.ytimg.com";
  } catch {
    return false;
  }
}

function pushIfAllowed(
  out: string[],
  primary: string,
  raw: string,
): void {
  let c: string;
  try {
    c = canonicalYoutubeThumbnailUrl(raw);
  } catch {
    return;
  }
  if (!isNextAllowedThumbUrl(c)) return;
  if (c !== primary) pushUnique(out, c);
}

/**
 * Ordered fallbacks when the primary thumb URL fails (404 etc.).
 * Uses API-provided URLs first, then plain `vi` / `vi_webp` paths.
 */
export function youtubeThumbnailFallbackUrls(
  id: string,
  video: VideoLikeForSummary | undefined,
  primary: string,
): string[] {
  const out: string[] = [];

  if (video?.thumbnailUrls?.length) {
    for (const u of video.thumbnailUrls) {
      if (u) pushIfAllowed(out, primary, u);
    }
  }

  for (const variant of THUMB_FALLBACK_VARIANTS) {
    pushIfAllowed(out, primary, `https://i.ytimg.com/vi/${id}/${variant}.jpg`);
  }
  for (const variant of THUMB_FALLBACK_VARIANTS) {
    pushIfAllowed(
      out,
      primary,
      `https://i.ytimg.com/vi_webp/${id}/${variant}.webp`,
    );
  }

  return out;
}

export function toVideoSummary(video: VideoLikeForSummary): VideoSummary | null {
  const id = video.id;
  if (!id) return null;
  const thumbnailUrl = preferredYoutubeThumbnailPath(id, video);
  const thumbnailFallbackUrls = youtubeThumbnailFallbackUrls(
    id,
    video,
    thumbnailUrl,
  );
  return {
    id,
    title: video.title?.trim() || "Untitled",
    thumbnailUrl,
    thumbnailFallbackUrls,
    channelName: video.channelName?.trim() || "Unknown channel",
    durationFormatted: video.live ? "LIVE" : video.durationFormatted || "—",
    uploadedAt: video.uploadedAt,
    live: video.live,
  };
}

export function toVideoSummaries(
  videos: VideoLikeForSummary[],
): VideoSummary[] {
  return videos.map(toVideoSummary).filter(Boolean) as VideoSummary[];
}
