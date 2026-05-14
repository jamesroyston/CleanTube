import { cache } from "react";

import {
  fetchYouTubeOEmbed,
  parseChannelIdFromYoutubeUrl,
} from "@/lib/oembed";
import {
  canonicalYoutubeThumbnailUrl,
  preferredYoutubeThumbnailPath,
} from "@/lib/serializeVideo";
import { getCachedInnertubeVideoInfo } from "@/lib/innertubeVideoInfoCache";
import { videoInfoToWatchDetails } from "@/lib/youtubeiAdapters";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

export type { WatchVideoDetails } from "@/lib/youtubeTypes";

const FALLBACK_TITLE = "Video";
const FALLBACK_CHANNEL = "Unknown channel";

function hasUsableWatchMetadata(video: WatchVideoDetails): boolean {
  return (
    video.title.trim() !== FALLBACK_TITLE &&
    video.channelName.trim() !== FALLBACK_CHANNEL
  );
}

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
    /** Present in many `ytInitialPlayerResponse` payloads — channel / author avatar. */
    authorThumbnail?: {
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

function descriptionFromWatchPlayerDetails(
  details: WatchHtmlPlayerResponse["videoDetails"],
): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const d = details as Record<string, unknown>;
  if (typeof d.shortDescription === "string") {
    const t = d.shortDescription.trim();
    if (t) return t;
  }
  const raw = d.description;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || undefined;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.simpleText === "string" && o.simpleText.trim()) {
      return o.simpleText.trim();
    }
    const runs = o.runs;
    if (Array.isArray(runs)) {
      const text = runs
        .map((r) =>
          r && typeof r === "object" && typeof (r as { text?: string }).text === "string"
            ? (r as { text: string }).text
            : "",
        )
        .join("");
      const t = text.trim();
      if (t) return t;
    }
  }
  return undefined;
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

  const authorThumbs = details.authorThumbnail?.thumbnails ?? [];
  const rawChannelThumb = authorThumbs
    .map((t) => t.url)
    .filter((url): url is string => Boolean(url))
    .at(-1);
  let channelThumbnailUrl: string | undefined;
  if (rawChannelThumb) {
    try {
      channelThumbnailUrl = canonicalYoutubeThumbnailUrl(rawChannelThumb);
    } catch {
      channelThumbnailUrl = rawChannelThumb;
    }
  }

  return {
    id,
    title: details.title.trim(),
    channelName: details.author?.trim() || "Unknown channel",
    channelId: details.channelId,
    channelUrl,
    channelThumbnailUrl,
    uploadedAt: parseIsoDateLabel(microformat?.publishDate ?? microformat?.uploadDate),
    views: Number.parseInt(
      details.viewCount ?? microformat?.viewCount ?? "0",
      10,
    ) || 0,
    description:
      descriptionFromWatchPlayerDetails(details) ||
      microformat?.description?.simpleText?.trim() ||
      undefined,
    thumbnailUrl: bestThumbnail
      ? canonicalYoutubeThumbnailUrl(bestThumbnail)
      : preferredYoutubeThumbnailPath(id),
    source: "watch-html",
  };
}

/**
 * Backfill description and/or channel avatar from watch HTML when InnerTube omits them
 * (`short_description`, `secondary_info.owner.author.thumbnails`, etc.).
 */
async function mergeDescriptionFromWatchHtml(
  id: string,
  video: WatchVideoDetails,
): Promise<WatchVideoDetails> {
  const hasDesc = Boolean(video.description?.trim());
  const hasThumb = Boolean(video.channelThumbnailUrl?.trim());
  if (hasDesc && hasThumb) return video;

  const html = await fetchWatchHtml(id);
  if (!html) return video;
  const fromHtml = fromWatchHtml(id, html);
  if (!fromHtml) return video;

  let next = video;
  const desc = fromHtml.description?.trim();
  if (desc) {
    if (!hasDesc || desc.length > (video.description?.trim().length ?? 0)) {
      next = { ...next, description: desc };
    }
  }
  const chThumb = fromHtml.channelThumbnailUrl?.trim();
  if (!hasThumb && chThumb) {
    next = { ...next, channelThumbnailUrl: chThumb };
  }
  return next;
}

async function fetchWatchHtml(videoId: string): Promise<string | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
  try {
    const res = await fetch(watchUrl, {
      cache: "no-store",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-CH-UA":
          '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"macOS"',
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function loadWatchVideoDetails(
  id: string,
): Promise<WatchVideoDetails | null> {
  if (!id || !isValidYoutubeVideoId(id)) return null;

  let fallbackVideo: WatchVideoDetails | null = null;

  const info = await getCachedInnertubeVideoInfo(id);
  if (info) {
    try {
      const video = videoInfoToWatchDetails(info, id);
      if (hasUsableWatchMetadata(video)) {
        return await mergeDescriptionFromWatchHtml(id, video);
      }
      fallbackVideo = video;
    } catch {
      /* fall through to HTML / oEmbed fallbacks */
    }
  }

  const watchHtml = await fetchWatchHtml(id);
  if (watchHtml) {
    const fromHtml = fromWatchHtml(id, watchHtml);
    if (fromHtml) {
      if (hasUsableWatchMetadata(fromHtml)) return fromHtml;
      fallbackVideo ??= fromHtml;
    }
  }

  const oembed = await fetchYouTubeOEmbed(id);
  return fromOEmbed(id, oembed) ?? fallbackVideo;
}

/** Dedupes InnerTube/HTML work within a single RSC request (e.g. `generateMetadata` + page). */
export const getWatchVideoDetails = cache(loadWatchVideoDetails);
