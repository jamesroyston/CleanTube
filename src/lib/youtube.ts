import YouTube, { type Video } from "youtube-sr";

import { YOUTUBE_FETCH_INIT } from "@/lib/youtubeRequest";

export type { Video };

/** True when the user clearly pasted or typed a YouTube link (not a plain keyword). */
export function isLikelyYouTubeUrl(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  if (YouTube.validate(t, "VIDEO")) return true;
  return /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(t);
}

/**
 * Video id from a YouTube watch/embed/short URL only.
 * Does not treat bare 11-character strings as ids so normal searches still work.
 */
export function extractVideoIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (YouTube.validate(trimmed, "VIDEO")) {
    const m = trimmed.match(YouTube.Regex.VIDEO_URL);
    return m?.[5] ?? null;
  }
  return null;
}

export async function searchVideos(query: string, limit = 24): Promise<Video[]> {
  const q = query.trim();
  if (!q) return [];
  return YouTube.search(q, {
    type: "video",
    limit,
    requestOptions: YOUTUBE_FETCH_INIT,
  });
}

/** @deprecated Prefer getWatchVideoDetails for watch + oEmbed fallback */
export async function getVideoById(id: string): Promise<Video | null> {
  if (!id || !YouTube.validate(id, "VIDEO_ID")) return null;
  try {
    return await YouTube.getVideo(
      `https://www.youtube.com/watch?v=${id}`,
      YOUTUBE_FETCH_INIT,
    );
  } catch {
    return null;
  }
}
