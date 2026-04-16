import type { Video } from "youtube-sr";

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

export function preferredYoutubeThumbnailPath(id: string, video?: Video): string {
  const raw =
    video?.thumbnail?.displayThumbnailURL(THUMB_VARIANT) ??
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

const DEFAULT_FRAME_IDS = ["0", "1", "2", "3", "4"] as const;

/**
 * Ordered fallbacks when the primary thumb URL fails (404 etc.).
 * Uses youtube-sr’s `Video.thumbnail` (raw `url`, per-variant URLs, default frame URLs),
 * then plain `vi` / `vi_webp` paths so we still get distinct tries when InnerTube URLs
 * duplicate after canonicalization.
 */
export function youtubeThumbnailFallbackUrls(
  id: string,
  video: Video | undefined,
  primary: string,
): string[] {
  const out: string[] = [];
  const surf = video?.thumbnail?.url;
  if (surf) pushIfAllowed(out, primary, surf);

  if (video?.thumbnail) {
    for (const variant of THUMB_FALLBACK_VARIANTS) {
      pushIfAllowed(out, primary, video.thumbnail.displayThumbnailURL(variant));
    }
    for (const frame of DEFAULT_FRAME_IDS) {
      pushIfAllowed(out, primary, video.thumbnail.defaultThumbnailURL(frame));
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

export function toVideoSummary(video: Video): VideoSummary | null {
  const id = video.id;
  if (!id) return null;
  const thumbnailUrl = preferredYoutubeThumbnailPath(id, video);
  const thumbnailFallbackUrls = youtubeThumbnailFallbackUrls(id, video, thumbnailUrl);
  return {
    id,
    title: video.title?.trim() || "Untitled",
    thumbnailUrl,
    thumbnailFallbackUrls,
    channelName: video.channel?.name?.trim() || "Unknown channel",
    durationFormatted: video.live ? "LIVE" : video.durationFormatted || "—",
    uploadedAt: video.uploadedAt,
    live: video.live,
  };
}

export function toVideoSummaries(videos: Video[]): VideoSummary[] {
  return videos.map(toVideoSummary).filter(Boolean) as VideoSummary[];
}
