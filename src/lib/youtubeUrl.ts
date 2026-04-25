const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

/** True for a syntactically valid 11-character YouTube video id. */
export function isValidYoutubeVideoId(id: string): boolean {
  return YOUTUBE_VIDEO_ID.test(id);
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

/** True when input looks like a YouTube URL (not a plain keyword). */
export function isLikelyYouTubeUrl(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  if (extractVideoIdFromUrl(t) != null) return true;
  return /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(t);
}
