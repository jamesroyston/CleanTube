import YouTube, {
  Formatter,
  Util,
  type Channel,
  type Playlist,
  type Video,
} from "youtube-sr";

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

type RawGridItem = Record<string, unknown>;

/**
 * youtube-sr's parseVideo assumes title.runs[0], thumbnail.thumbnails[], and
 * ownerText.runs[0] exist. YouTube's JSON often uses title.simpleText or omits
 * channel rows; that throws and aborts the entire Formatter.formatSearchResult loop.
 */
function normalizeVideoRendererItem(data: RawGridItem): RawGridItem {
  const vr = data.videoRenderer as Record<string, unknown> | undefined;
  if (!vr) return data;

  const videoId = vr.videoId as string | undefined;
  const nvr: Record<string, unknown> = { ...vr };
  const next: RawGridItem = { ...data, videoRenderer: nvr };

  const title = nvr.title as Record<string, unknown> | undefined;
  if (title && !Array.isArray(title.runs) && typeof title.simpleText === "string") {
    nvr.title = { runs: [{ text: title.simpleText }] };
  }

  const thumb = nvr.thumbnail as { thumbnails?: unknown[] } | undefined;
  if ((!thumb?.thumbnails || thumb.thumbnails.length === 0) && videoId) {
    nvr.thumbnail = {
      thumbnails: [
        {
          url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          width: 480,
          height: 360,
        },
      ],
    };
  }

  const owner = nvr.ownerText as { runs?: unknown[] } | undefined;
  if (!owner?.runs?.length) {
    nvr.ownerText = {
      runs: [
        {
          text: "Unknown channel",
          navigationEndpoint: {
            browseEndpoint: { browseId: "", canonicalBaseUrl: "" },
            commandMetadata: { webCommandMetadata: { url: "/" } },
          },
        },
      ],
    };
  }

  return next;
}

let youtubeSrFormatterPatched = false;

/**
 * Patch youtube-sr once: per-item try/catch + normalization so one bad renderer
 * does not reject the whole search (and the UI does not fall into the error path).
 */
function applyYoutubeSrSafeFormatter(): void {
  if (youtubeSrFormatterPatched) return;
  youtubeSrFormatterPatched = true;

  Formatter.formatSearchResult = function formatSearchResultSafe(
    details: unknown,
    options: { limit?: number; type?: string } = {
      limit: 100,
      type: "all",
    },
  ): (Video | Channel | Playlist)[] {
    if (!Array.isArray(details)) return [];

    const opts = { ...options };
    if (opts.type == null) opts.type = "video";
    const results: (Video | Channel | Playlist)[] = [];

    for (let i = 0; i < details.length; i++) {
      if (
        typeof opts.limit === "number" &&
        opts.limit > 0 &&
        results.length >= opts.limit
      ) {
        break;
      }

      const raw = details[i] as RawGridItem;
      let res: Video | Channel | Playlist | undefined;

      try {
        let data = raw;
        if (opts.type === "all") {
          if (data.videoRenderer) opts.type = "video";
          else if (data.channelRenderer) opts.type = "channel";
          else if (data.playlistRenderer) opts.type = "playlist";
          else continue;
        }

        if (opts.type === "video" || opts.type === "film") {
          data = normalizeVideoRendererItem(data);
          const parsed = Util.parseVideo(data);
          if (!parsed) continue;
          res = parsed;
        } else if (opts.type === "channel") {
          const parsed = Util.parseChannel(data);
          if (!parsed) continue;
          res = parsed;
        } else if (opts.type === "playlist") {
          const parsed = Util.parsePlaylist(data);
          if (!parsed) continue;
          res = parsed;
        }

        if (res) results.push(res);
      } catch {
        continue;
      }
    }

    return results;
  };
}

applyYoutubeSrSafeFormatter();

export async function searchVideos(query: string, limit = 24): Promise<Video[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    return await YouTube.search(q, {
      type: "video",
      limit,
      requestOptions: YOUTUBE_FETCH_INIT,
    });
  } catch {
    return [];
  }
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
