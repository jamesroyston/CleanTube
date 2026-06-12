import { cache } from "react";

import {
  canonicalYoutubeThumbnailUrl,
  preferredYoutubeThumbnailPath,
} from "@/lib/serializeVideo";
import { formatYoutubeDurationSeconds } from "@/lib/youtubeiAdapters";
import type {
  ChannelDetails,
  ChannelSortMode,
  ChannelVideosPage,
  VideoLikeForSummary,
  WatchVideoDetails,
} from "@/lib/youtubeTypes";
import { isValidYoutubeChannelId, isValidYoutubeVideoId } from "@/lib/youtubeUrl";

/**
 * Official YouTube Data API v3 backend.
 *
 * InnerTube (`youtubei.js`) `getInfo` (watch) and `getChannel` (channel) calls are
 * bot-challenged from datacenter IPs (e.g. Vercel) and fall through to oEmbed / empty
 * results. The Data API is fully documented and works from any server, so we use it as a
 * reliable fallback / backfill whenever a key is configured. When no key is present this
 * module is inert and the app keeps its InnerTube-only behavior (e.g. on localhost).
 */

const API_BASE = "https://www.googleapis.com/youtube/v3";
const DEFAULT_PAGE_SIZE = 24;
const MAX_PLAYLIST_REQUESTS = 10;

export function getYoutubeDataApiKey(): string | undefined {
  const key =
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.YOUTUBE_DATA_API_KEY?.trim();
  return key || undefined;
}

export function isYoutubeDataApiEnabled(): boolean {
  return Boolean(getYoutubeDataApiKey());
}

type ApiThumbnail = { url?: string; width?: number; height?: number };
type ApiThumbnails = Record<string, ApiThumbnail | undefined>;

type VideoListItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: ApiThumbnails;
  };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
};

type ChannelListItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    publishedAt?: string;
    thumbnails?: ApiThumbnails;
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
  brandingSettings?: { image?: { bannerExternalUrl?: string } };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

type PlaylistItemsResponse = {
  items?: { contentDetails?: { videoId?: string } }[];
  nextPageToken?: string;
};

async function dataApiGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T | null> {
  const key = getYoutubeDataApiKey();
  if (!key) return null;
  const search = new URLSearchParams({ ...params, key });
  try {
    const res = await fetch(`${API_BASE}/${path}?${search.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function bestThumbnailUrl(thumbs: ApiThumbnails | undefined): string | undefined {
  if (!thumbs) return undefined;
  const order = ["maxres", "standard", "high", "medium", "default"];
  for (const k of order) {
    const url = thumbs[k]?.url;
    if (url) {
      try {
        return canonicalYoutubeThumbnailUrl(url);
      } catch {
        return url;
      }
    }
  }
  for (const t of Object.values(thumbs)) {
    if (t?.url) {
      try {
        return canonicalYoutubeThumbnailUrl(t.url);
      } catch {
        return t.url;
      }
    }
  }
  return undefined;
}

function collectThumbnailUrls(thumbs: ApiThumbnails | undefined): string[] {
  if (!thumbs) return [];
  const out: string[] = [];
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const url = thumbs[key]?.url;
    if (!url) continue;
    try {
      const c = canonicalYoutubeThumbnailUrl(url);
      if (!out.includes(c)) out.push(c);
    } catch {
      /* skip */
    }
  }
  return out;
}

/** ISO-8601 duration (e.g. `PT4M13S`, `PT1H2M`) to total seconds. */
function parseIsoDurationSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isFinite(total) ? total : undefined;
}

const RELATIVE_UNITS: [string, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** Mirrors InnerTube's "16 years ago" style so the watch/grid UI stays consistent. */
function relativeTimeFromIso(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return undefined;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  for (const [unit, secs] of RELATIVE_UNITS) {
    const n = Math.floor(diffSeconds / secs);
    if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function formatCompactCount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function compactNumber(n: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}

function isLiveBroadcast(value: string | undefined): boolean {
  return value === "live";
}

function channelUrlFromId(id: string): string {
  return `https://www.youtube.com/channel/${id}`;
}

function videoItemToWatchDetails(
  item: VideoListItem,
  id: string,
  channelThumbnailUrl: string | undefined,
): WatchVideoDetails | null {
  const snippet = item.snippet;
  const title = snippet?.title?.trim();
  if (!title) return null;
  const channelId = snippet?.channelId;
  const thumbnailUrl =
    bestThumbnailUrl(snippet?.thumbnails) ?? preferredYoutubeThumbnailPath(id);
  return {
    id,
    title,
    channelName: snippet?.channelTitle?.trim() || "Unknown channel",
    channelId,
    channelUrl: channelId ? channelUrlFromId(channelId) : undefined,
    channelThumbnailUrl,
    uploadedAt: relativeTimeFromIso(snippet?.publishedAt),
    views: formatCompactCount(item.statistics?.viewCount) ?? 0,
    description: snippet?.description?.trim() || undefined,
    thumbnailUrl,
    source: "data-api",
  };
}

async function loadChannelAvatarViaDataApi(
  channelId: string | undefined,
): Promise<string | undefined> {
  if (!channelId || !isValidYoutubeChannelId(channelId)) return undefined;
  const data = await dataApiGet<{ items?: ChannelListItem[] }>("channels", {
    part: "snippet",
    id: channelId,
  });
  const item = data?.items?.[0];
  return bestThumbnailUrl(item?.snippet?.thumbnails);
}

const getChannelAvatarViaDataApi = cache(loadChannelAvatarViaDataApi);

async function loadVideoDetailsViaDataApi(
  id: string,
): Promise<WatchVideoDetails | null> {
  if (!isYoutubeDataApiEnabled() || !isValidYoutubeVideoId(id)) return null;
  const data = await dataApiGet<{ items?: VideoListItem[] }>("videos", {
    part: "snippet,statistics,contentDetails",
    id,
  });
  const item = data?.items?.[0];
  if (!item) return null;
  const channelThumbnailUrl = await getChannelAvatarViaDataApi(
    item.snippet?.channelId,
  );
  return videoItemToWatchDetails(item, id, channelThumbnailUrl);
}

/** One Data API video lookup per id per request (RSC / API route). */
export const getVideoDetailsViaDataApi = cache(loadVideoDetailsViaDataApi);

function channelItemToDetails(
  item: ChannelListItem,
  fallbackLookup: string,
): ChannelDetails | null {
  const id = item.id || (isValidYoutubeChannelId(fallbackLookup) ? fallbackLookup : undefined);
  if (!id) return null;
  const snippet = item.snippet;
  const stats = item.statistics;

  const subs = formatCompactCount(stats?.subscriberCount);
  const videos = formatCompactCount(stats?.videoCount);
  const views = formatCompactCount(stats?.viewCount);
  const joined = snippet?.publishedAt ? new Date(snippet.publishedAt) : null;

  const handleRaw = snippet?.customUrl?.trim();
  const handle = handleRaw
    ? handleRaw.startsWith("@")
      ? handleRaw
      : `@${handleRaw}`
    : undefined;

  return {
    id,
    title: snippet?.title?.trim() || "Channel",
    handle,
    description: snippet?.description?.trim() || undefined,
    channelUrl: channelUrlFromId(id),
    thumbnailUrl: bestThumbnailUrl(snippet?.thumbnails),
    bannerUrl: item.brandingSettings?.image?.bannerExternalUrl || undefined,
    subscriberText:
      stats?.hiddenSubscriberCount || subs == null
        ? undefined
        : `${compactNumber(subs)} subscribers`,
    videoCountText: videos == null ? undefined : `${compactNumber(videos)} videos`,
    viewCountText: views == null ? undefined : `${views.toLocaleString("en-US")} views`,
    joinedDateText:
      joined && !Number.isNaN(joined.getTime())
        ? `Joined ${joined.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}`
        : undefined,
    source: "data-api",
  };
}

/** Build the channels.list query params from a UC id, @handle, or legacy username. */
function channelLookupParams(lookup: string): Record<string, string> | null {
  const trimmed = lookup.trim();
  if (!trimmed) return null;
  if (isValidYoutubeChannelId(trimmed)) return { id: trimmed };
  if (trimmed.startsWith("@")) return { forHandle: trimmed };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && parts[1]) {
        return isValidYoutubeChannelId(parts[1]) ? { id: parts[1] } : null;
      }
      if (parts[0]?.startsWith("@")) return { forHandle: parts[0] };
      if ((parts[0] === "user" || parts[0] === "c") && parts[1]) {
        return { forUsername: parts[1] };
      }
    } catch {
      return null;
    }
    return null;
  }

  return { forHandle: `@${trimmed}` };
}

async function loadChannelItemViaDataApi(
  lookup: string,
): Promise<ChannelListItem | null> {
  if (!isYoutubeDataApiEnabled()) return null;
  const params = channelLookupParams(lookup);
  if (!params) return null;
  const data = await dataApiGet<{ items?: ChannelListItem[] }>("channels", {
    part: "snippet,statistics,brandingSettings,contentDetails",
    ...params,
  });
  return data?.items?.[0] ?? null;
}

const getChannelItemViaDataApi = cache(loadChannelItemViaDataApi);

export async function getChannelDetailsViaDataApi(
  lookup: string,
): Promise<ChannelDetails | null> {
  const item = await getChannelItemViaDataApi(lookup);
  if (!item) return null;
  return channelItemToDetails(item, lookup);
}

function videoItemToVideoLike(item: VideoListItem): VideoLikeForSummary | null {
  const id = item.id;
  if (!id) return null;
  const snippet = item.snippet;
  const live = isLiveBroadcast(snippet?.liveBroadcastContent);
  const seconds = parseIsoDurationSeconds(item.contentDetails?.duration);
  return {
    id,
    title: snippet?.title?.trim() || undefined,
    channelName: snippet?.channelTitle?.trim() || "Unknown channel",
    durationFormatted: live ? "LIVE" : formatYoutubeDurationSeconds(seconds),
    uploadedAt: relativeTimeFromIso(snippet?.publishedAt),
    live,
    thumbnailUrls: collectThumbnailUrls(snippet?.thumbnails),
  };
}

function normalizePageNumber(pageToken: string | undefined): number {
  const n = Number.parseInt(pageToken ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

async function collectUploadIds(
  uploadsPlaylistId: string,
  needed: number,
): Promise<{ ids: string[]; reachedEnd: boolean }> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let requests = 0;
  let reachedEnd = false;

  while (ids.length < needed && requests < MAX_PLAYLIST_REQUESTS) {
    const params: Record<string, string> = {
      part: "contentDetails",
      maxResults: "50",
      playlistId: uploadsPlaylistId,
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await dataApiGet<PlaylistItemsResponse>(
      "playlistItems",
      params,
    );
    requests += 1;
    if (!data) break;
    for (const item of data.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) ids.push(videoId);
    }
    if (!data.nextPageToken) {
      reachedEnd = true;
      break;
    }
    pageToken = data.nextPageToken;
  }

  return { ids, reachedEnd };
}

async function fetchVideoLikesForIds(
  ids: string[],
): Promise<VideoLikeForSummary[]> {
  if (ids.length === 0) return [];
  const data = await dataApiGet<{ items?: VideoListItem[] }>("videos", {
    part: "snippet,contentDetails,statistics",
    id: ids.join(","),
  });
  const byId = new Map<string, VideoLikeForSummary>();
  for (const item of data?.items ?? []) {
    const mapped = videoItemToVideoLike(item);
    if (mapped) byId.set(mapped.id, mapped);
  }
  // Preserve the upload playlist order.
  return ids.map((id) => byId.get(id)).filter((v): v is VideoLikeForSummary => Boolean(v));
}

export async function getChannelPageViaDataApi(input: {
  channelId: string;
  sort?: ChannelSortMode;
  pageToken?: string;
  limit?: number;
}): Promise<ChannelVideosPage | null> {
  if (!isYoutubeDataApiEnabled()) return null;
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const sort: ChannelSortMode = input.sort ?? "latest";

  const item = await getChannelItemViaDataApi(input.channelId);
  if (!item) return null;
  const channel = channelItemToDetails(item, input.channelId);
  if (!channel) return null;

  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  const totalVideos = formatCompactCount(item.statistics?.videoCount);

  const pageNumber = normalizePageNumber(input.pageToken);
  const offset = (pageNumber - 1) * limit;

  let videos: VideoLikeForSummary[] = [];
  let reachedEnd = true;
  if (uploadsPlaylistId) {
    const { ids, reachedEnd: end } = await collectUploadIds(
      uploadsPlaylistId,
      offset + limit + 1,
    );
    reachedEnd = end;
    const pageIds = ids.slice(offset, offset + limit);
    videos = await fetchVideoLikesForIds(pageIds);
  }

  const hasNext =
    totalVideos != null
      ? pageNumber * limit < totalVideos
      : !reachedEnd && videos.length >= limit;
  const totalPages =
    totalVideos != null && limit > 0
      ? Math.max(1, Math.ceil(totalVideos / limit))
      : undefined;

  return {
    channel,
    videos,
    sort,
    pageToken: String(pageNumber),
    nextPageToken: hasNext ? String(pageNumber + 1) : undefined,
    previousPageToken: pageNumber > 1 ? String(pageNumber - 1) : undefined,
    totalPages:
      totalPages == null
        ? undefined
        : Math.max(totalPages, hasNext ? pageNumber + 1 : pageNumber),
    emptyGridHint: videos.length > 0 ? "none" : "likely_empty",
  };
}
