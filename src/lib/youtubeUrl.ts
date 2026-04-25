const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_CHANNEL_ID = /^UC[a-zA-Z0-9_-]{22}$/;

/** True for a syntactically valid 11-character YouTube video id. */
export function isValidYoutubeVideoId(id: string): boolean {
  return YOUTUBE_VIDEO_ID.test(id);
}

/** True for a syntactically valid canonical YouTube channel id. */
export function isValidYoutubeChannelId(id: string): boolean {
  return YOUTUBE_CHANNEL_ID.test(id);
}

/**
 * Video id from a watch / embed / shorts / live URL.
 * Does not treat a bare 11-character string as an id so normal keyword search still works.
 */
export function extractVideoIdFromUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;

  const patterns: RegExp[] = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\/embed\/([a-zA-Z0-9_-]{11})/i,
    /\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /\/live\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1] && isValidYoutubeVideoId(m[1])) return m[1];
  }
  return null;
}

/**
 * Channel route token from a YouTube channel URL.
 * Supports canonical channel ids and handles; custom/user URLs are returned as
 * best-effort tokens for the channel backend to resolve.
 */
export function extractChannelRouteTokenFromUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (isValidYoutubeChannelId(t)) return t;

  try {
    const url = new URL(t);
    if (!/youtube\.com|youtube-nocookie\.com/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) return parts[1];
    if (parts[0]?.startsWith("@")) return parts[0];
  } catch {
    return null;
  }

  return null;
}

export function extractHighConfidenceChannelLookup(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (isValidYoutubeChannelId(t) || /^@[a-zA-Z0-9._-]+$/.test(t)) return t;
  return extractChannelRouteTokenFromUrl(t);
}

export function channelPageHrefFromToken(token: string): string {
  return `/channel/${encodeURIComponent(token)}`;
}

/** True when input looks like a YouTube URL (not a plain keyword). */
export function isLikelyYouTubeUrl(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  if (extractVideoIdFromUrl(t) != null) return true;
  if (extractChannelRouteTokenFromUrl(t) != null) return true;
  return /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(t);
}
