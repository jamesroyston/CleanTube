import {
  fetchYouTubeOEmbed,
  parseChannelIdFromYoutubeUrl,
} from "@/lib/oembed";
import {
  canonicalYoutubeThumbnailUrl,
  preferredYoutubeThumbnailPath,
} from "@/lib/serializeVideo";
import { videoInfoToWatchDetails } from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

export type { WatchVideoDetails } from "@/lib/youtubeTypes";

function fromOEmbed(
  id: string,
  o: Awaited<ReturnType<typeof fetchYouTubeOEmbed>>,
): WatchVideoDetails | null {
  if (!o) return null;
  const channelUrl = o.author_url || undefined;
  return {
    id,
    title: o.title,
    channelName: o.author_name || "Unknown channel",
    channelId: channelUrl
      ? parseChannelIdFromYoutubeUrl(channelUrl)
      : undefined,
    channelUrl,
    uploadedAt: undefined,
    views: 0,
    description: undefined,
    thumbnailUrl: preferredYoutubeThumbnailPath(id),
    source: "oembed",
  };
}

type WatchHtmlPlayerResponse = {
  videoDetails?: {
    title?: string;
    author?: string;
    channelId?: string;
    shortDescription?: string;
    viewCount?: string;
    thumbnail?: {
      thumbnails?: { url?: string }[];
    };
  };
  microformat?: {
    playerMicroformatRenderer?: {
      ownerProfileUrl?: string;
      publishDate?: string;
      uploadDate?: string;
      viewCount?: string;
      description?: {
        simpleText?: string;
      };
    };
  };
};

function extractBalancedJson(source: string, marker: string): string | null {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf("{", markerIndex);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  return null;
}

function parseIsoDateLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fromWatchHtml(
  id: string,
  html: string,
): WatchVideoDetails | null {
  const raw =
    extractBalancedJson(html, "ytInitialPlayerResponse") ??
    extractBalancedJson(html, "initialPlayerResponse");
  if (!raw) return null;

  let parsed: WatchHtmlPlayerResponse;
  try {
    parsed = JSON.parse(raw) as WatchHtmlPlayerResponse;
  } catch {
    return null;
  }

  const details = parsed.videoDetails;
  if (!details?.title?.trim()) return null;

  const microformat = parsed.microformat?.playerMicroformatRenderer;
  const channelUrl = microformat?.ownerProfileUrl
    ? `https://www.youtube.com${microformat.ownerProfileUrl}`
    : details.channelId
      ? `https://www.youtube.com/channel/${details.channelId}`
      : undefined;
  const thumbnails = details.thumbnail?.thumbnails ?? [];
  const bestThumbnail = thumbnails
    .map((thumbnail) => thumbnail.url)
    .filter((url): url is string => Boolean(url))
    .at(-1);

  return {
    id,
    title: details.title.trim(),
    channelName: details.author?.trim() || "Unknown channel",
    channelId: details.channelId,
    channelUrl,
    uploadedAt: parseIsoDateLabel(microformat?.publishDate ?? microformat?.uploadDate),
    views: Number.parseInt(
      details.viewCount ?? microformat?.viewCount ?? "0",
      10,
    ) || 0,
    description:
      details.shortDescription?.trim() ||
      microformat?.description?.simpleText?.trim() ||
      undefined,
    thumbnailUrl: bestThumbnail
      ? canonicalYoutubeThumbnailUrl(bestThumbnail)
      : preferredYoutubeThumbnailPath(id),
    source: "watch-html",
  };
}

async function fetchWatchHtml(videoId: string): Promise<string | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
  try {
    const res = await fetch(watchUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function getWatchVideoDetails(
  id: string,
): Promise<WatchVideoDetails | null> {
  if (!id || !isValidYoutubeVideoId(id)) return null;

  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(id);
    return videoInfoToWatchDetails(info, id);
  } catch {
    /* fall through to HTML / oEmbed fallbacks */
  }

  const watchHtml = await fetchWatchHtml(id);
  if (watchHtml) {
    const fromHtml = fromWatchHtml(id, watchHtml);
    if (fromHtml) return fromHtml;
  }

  const oembed = await fetchYouTubeOEmbed(id);
  return fromOEmbed(id, oembed);
}
