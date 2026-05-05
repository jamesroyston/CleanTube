import { unstable_cache } from "next/cache";
import { cache } from "react";

import { canonicalYoutubeThumbnailUrl } from "@/lib/serializeVideo";
import {
  channelFeedVideoToVideoLike,
  feedVideoToVideoLike,
} from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import type { ChannelVideosVariant } from "@/lib/channelVideosPreferenceConstants";
import type {
  ChannelDetails,
  ChannelSortMode,
  ChannelVideosPage,
  VideoLikeForSummary,
} from "@/lib/youtubeTypes";

/** InnerTube channel: one `getChannel` per normalized lookup per request (`cache`); metadata uses `getChannelDetails` only, page adds `getVideos`. */
const DEFAULT_PAGE_SIZE = 24;
const CHANNEL_ID_PATTERN = /^UC[a-zA-Z0-9_-]{22}$/;
const ROBUST_PAGE1_MAX_CONTINUATIONS = 8;
const ROBUST_DEEP_PAGE_MAX_CONTINUATIONS = 4;
const RETRY_ATTEMPTS = 3;

type Thumbnailish = { url?: string };

type FeedLike = {
  videos?: unknown[];
  has_continuation?: boolean;
  getContinuation?: () => Promise<FeedLike>;
  applySort?: (sort: string) => Promise<FeedLike>;
  sort_filters?: string[];
};

type ChannelLike = FeedLike & {
  metadata?: {
    title?: string;
    description?: string;
    url?: string;
    url_canonical?: string;
    vanity_channel_url?: string;
    external_id?: string;
    thumbnail?: Thumbnailish[];
    avatar?: Thumbnailish[];
  };
  header?: unknown;
  title?: string;
  getVideos?: () => Promise<FeedLike>;
  getAbout?: () => Promise<unknown>;
};

type InnertubeLike = {
  getChannel: (id: string) => Promise<unknown>;
  resolveURL: (url: string) => Promise<{
    payload?: { browseId?: string };
    metadata?: { url?: string };
  }>;
};

type ChannelBackend = {
  getChannelDetails(channelIdOrUrl: string): Promise<ChannelDetails | null>;
  getChannelVideos(input: {
    channelId: string;
    sort?: ChannelSortMode;
    pageToken?: string;
    limit?: number;
  }): Promise<ChannelVideosPage | null>;
};

function channelVideosDebugEnabled(): boolean {
  return process.env.CHANNEL_VIDEOS_DEBUG === "1";
}

async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = RETRY_ATTEMPTS,
): Promise<T | null> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 140 * (i + 1)));
    }
  }
  if (channelVideosDebugEnabled()) {
    console.warn(`[channel videos] ${label}: exhausted retries`, last);
  }
  return null;
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "content", "text", "simpleText", "title"]) {
      const nested = record[key];
      if (typeof nested === "string" && nested.trim()) {
        return nested.trim();
      }
    }
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toString?: () => string }).toString === "function"
  ) {
    const out = String((value as { toString: () => string }).toString()).trim();
    return out && out !== "[object Object]" ? out : undefined;
  }
  return undefined;
}

function objectValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function decodeUrlSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function firstThumbnailUrl(value: unknown): string | undefined {
  const thumbs = Array.isArray(value) ? (value as Thumbnailish[]) : undefined;
  const raw = thumbs?.find((thumbnail) => thumbnail.url)?.url;
  if (!raw) return undefined;
  return canonicalYoutubeThumbnailUrl(raw);
}

function lastThumbnailUrl(value: unknown): string | undefined {
  const thumbs = Array.isArray(value) ? (value as Thumbnailish[]) : undefined;
  const raw = thumbs?.findLast((thumbnail) => thumbnail.url)?.url;
  if (!raw) return undefined;
  return canonicalYoutubeThumbnailUrl(raw);
}

function normalizeChannelLookup(input: string): string {
  const trimmed = decodeUrlSegment(input.trim());
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean).map(decodeUrlSegment);
    if (parts[0] === "channel" && parts[1]) return parts[1];
    if (parts[0]?.startsWith("@")) return parts[0];
    if ((parts[0] === "c" || parts[0] === "user") && parts[1]) {
      return trimmed;
    }
  } catch {
    /* use trimmed input below */
  }

  return trimmed;
}

async function resolveChannelLookup(
  yt: InnertubeLike,
  lookup: string,
): Promise<string> {
  if (CHANNEL_ID_PATTERN.test(lookup)) return lookup;
  const url = lookup.startsWith("@")
    ? `https://www.youtube.com/${lookup}`
    : /^https?:\/\//i.test(lookup)
      ? lookup
      : null;

  if (!url) return lookup;

  try {
    const endpoint = await yt.resolveURL(url);
    return endpoint.payload?.browseId || lookup;
  } catch {
    return lookup;
  }
}

function channelIdFromCanonicalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const maybeId = parts[0] === "channel" ? parts[1] : undefined;
    return maybeId && CHANNEL_ID_PATTERN.test(maybeId) ? maybeId : undefined;
  } catch {
    return undefined;
  }
}

function headerText(header: unknown, key: string): string | undefined {
  return text(objectValue(header, key));
}

function pageHeaderText(header: unknown, key: string): string | undefined {
  const content = objectValue(header, "content");
  return text(objectValue(content, key));
}

function detailsFromChannel(
  channel: ChannelLike,
  about: unknown,
  lookup: string,
): ChannelDetails | null {
  const metadata = channel.metadata;
  const header = channel.header;
  const aboutMetadata = objectValue(about, "metadata");
  const canonicalUrl =
    text(objectValue(aboutMetadata, "canonical_channel_url")) ||
    metadata?.url_canonical ||
    metadata?.url ||
    metadata?.vanity_channel_url;
  const id =
    text(objectValue(aboutMetadata, "channel_id")) ||
    headerText(header, "channel_id") ||
    metadata?.external_id ||
    channelIdFromCanonicalUrl(canonicalUrl) ||
    (CHANNEL_ID_PATTERN.test(lookup) ? lookup : undefined);

  if (!id) return null;

  const title =
    text(objectValue(aboutMetadata, "name")) ||
    headerText(header, "author") ||
    pageHeaderText(header, "page_title") ||
    pageHeaderText(header, "title") ||
    metadata?.title ||
    channel.title ||
    "Channel";
  const handle =
    headerText(header, "channel_handle") ||
    (canonicalUrl?.includes("/@")
      ? `@${canonicalUrl.split("/@")[1]?.split("/")[0]}`
      : undefined);

  return {
    id,
    title,
    handle,
    description:
      text(objectValue(aboutMetadata, "description")) || metadata?.description,
    channelUrl: canonicalUrl || `https://www.youtube.com/channel/${id}`,
    thumbnailUrl:
      firstThumbnailUrl(objectValue(aboutMetadata, "avatar")) ||
      firstThumbnailUrl(metadata?.avatar) ||
      firstThumbnailUrl(metadata?.thumbnail) ||
      firstThumbnailUrl(objectValue(header, "box_art")) ||
      firstThumbnailUrl(objectValue(header, "avatar")),
    bannerUrl:
      lastThumbnailUrl(objectValue(header, "banner")) ||
      lastThumbnailUrl(metadata?.thumbnail),
    subscriberText:
      text(objectValue(aboutMetadata, "subscriber_count")) ||
      headerText(header, "subscribers"),
    videoCountText:
      text(objectValue(aboutMetadata, "video_count")) ||
      headerText(header, "videos_count"),
    viewCountText: text(objectValue(aboutMetadata, "view_count")),
    joinedDateText: text(objectValue(aboutMetadata, "joined_date")),
    source: "youtubei.js",
  };
}

function normalizePageToken(pageToken: string | undefined): number {
  const pageNumber = Number.parseInt(pageToken ?? "1", 10);
  return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
}

function parseCountText(value: string | undefined): number | undefined {
  const normalized = value?.replace(/,/g, "").trim().toLowerCase();
  if (!normalized) return undefined;

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([kmb])?/);
  if (!match?.[1]) return undefined;

  const base = Number.parseFloat(match[1]);
  if (!Number.isFinite(base)) return undefined;

  const multiplier =
    match[2] === "b"
      ? 1_000_000_000
      : match[2] === "m"
        ? 1_000_000
        : match[2] === "k"
          ? 1_000
          : 1;

  return Math.floor(base * multiplier);
}

function totalPagesFromVideoCount(
  videoCountText: string | undefined,
  pageSize: number,
): number | undefined {
  if (pageSize <= 0) return undefined;
  const totalVideos = parseCountText(videoCountText);
  if (totalVideos == null || totalVideos <= 0) return undefined;
  return Math.max(1, Math.ceil(totalVideos / pageSize));
}

async function sortedVideosFeed(
  feed: FeedLike,
  sort: ChannelSortMode,
): Promise<FeedLike> {
  if (sort === "latest") return feed;
  const sortFilter = feed.sort_filters?.find((filter) =>
    filter.toLowerCase().includes("popular"),
  );
  if (!sortFilter || typeof feed.applySort !== "function") return feed;
  try {
    return await feed.applySort(sortFilter);
  } catch {
    return feed;
  }
}

async function feedAtPage(
  initialFeed: FeedLike,
  pageNumber: number,
): Promise<{ feed: FeedLike; continuationFailed: boolean }> {
  let feed = initialFeed;
  for (let page = 1; page < pageNumber; page += 1) {
    if (!feed.has_continuation || typeof feed.getContinuation !== "function") {
      return { feed, continuationFailed: false };
    }
    try {
      feed = await feed.getContinuation();
    } catch {
      return { feed, continuationFailed: true };
    }
  }
  return { feed, continuationFailed: false };
}

function videosFromFeed(
  feed: FeedLike,
  limit: number,
  mapItem: (item: unknown) => VideoLikeForSummary | null,
): VideoLikeForSummary[] {
  const out: VideoLikeForSummary[] = [];
  const seen = new Set<string>();
  for (const item of feed.videos ?? []) {
    const video = mapItem(item);
    if (!video || seen.has(video.id)) continue;
    seen.add(video.id);
    out.push(video);
    if (out.length >= limit) break;
  }
  return out;
}

function countUnmappedRaw(
  feed: FeedLike,
  mapItem: (item: unknown) => VideoLikeForSummary | null,
): { raw: number; mapped: number } {
  const raw = feed.videos?.length ?? 0;
  let mapped = 0;
  const seen = new Set<string>();
  for (const item of feed.videos ?? []) {
    const v = mapItem(item);
    if (v && !seen.has(v.id)) {
      seen.add(v.id);
      mapped++;
    }
  }
  return { raw, mapped };
}

async function collectMappedAcrossContinuations(
  start: FeedLike,
  limit: number,
  mapItem: (item: unknown) => VideoLikeForSummary | null,
  maxContinuationSteps: number,
): Promise<{
  videos: VideoLikeForSummary[];
  endFeed: FeedLike;
  rawItemCount: number;
  lostItems: boolean;
}> {
  const videos: VideoLikeForSummary[] = [];
  const seen = new Set<string>();
  let feed = start;
  let rawItemCount = 0;
  let stepsUsed = 0;
  let lostItems = false;

  while (videos.length < limit && stepsUsed <= maxContinuationSteps) {
    const { raw, mapped } = countUnmappedRaw(feed, mapItem);
    rawItemCount += raw;
    if (raw > 0 && mapped === 0) lostItems = true;

    for (const item of feed.videos ?? []) {
      const v = mapItem(item);
      if (v && !seen.has(v.id)) {
        seen.add(v.id);
        videos.push(v);
        if (videos.length >= limit) break;
      }
    }
    if (videos.length >= limit) break;
    if (!feed.has_continuation || typeof feed.getContinuation !== "function") break;
    try {
      feed = await feed.getContinuation();
      stepsUsed++;
    } catch {
      break;
    }
  }

  return { videos, endFeed: feed, rawItemCount, lostItems };
}

function withChannelName(
  video: VideoLikeForSummary,
  channel: ChannelDetails,
): VideoLikeForSummary {
  const channelName = video.channelName?.trim();
  if (channelName && channelName !== "N/A" && channelName !== "Unknown channel") {
    return video;
  }
  return {
    ...video,
    channelName: channel.title,
  };
}

function emptyGridHintFromSignals(input: {
  videoCount: number;
  hasNext: boolean;
  rawItemCount: number;
  continuationFailed: boolean;
  lostItems: boolean;
}): "none" | "try_again" | "likely_empty" {
  if (input.videoCount > 0) return "none";
  if (input.continuationFailed || input.lostItems || input.rawItemCount > 0) {
    return "try_again";
  }
  if (!input.hasNext) return "likely_empty";
  return "try_again";
}

function refineEmptyHint(
  hint: "none" | "try_again" | "likely_empty",
  videoCountText: string | undefined,
  hasNext: boolean,
): "none" | "try_again" | "likely_empty" {
  if (hint !== "likely_empty" && hint !== "try_again") return hint;
  const n = parseCountText(videoCountText);
  if (n != null && n === 0 && !hasNext) return "likely_empty";
  if (n != null && n > 0) return "try_again";
  return hint;
}

async function fetchChannelRaw(lookup: string): Promise<ChannelLike | null> {
  if (!lookup) return null;
  try {
    const yt = (await getInnertube()) as InnertubeLike;
    const resolvedLookup = await resolveChannelLookup(yt, lookup);
    return (await yt.getChannel(resolvedLookup)) as ChannelLike;
  } catch {
    return null;
  }
}

/** One `getChannel` per normalized `lookup` per request (e.g. metadata + video grid share it). */
const loadChannel = cache(fetchChannelRaw);

async function loadAbout(channel: ChannelLike): Promise<unknown> {
  if (typeof channel.getAbout !== "function") return null;
  try {
    return await channel.getAbout();
  } catch {
    return null;
  }
}

async function getChannelVideosRobustInner({
  channelId,
  sort = "latest",
  pageToken,
  limit = DEFAULT_PAGE_SIZE,
}: {
  channelId: string;
  sort?: ChannelSortMode;
  pageToken?: string;
  limit?: number;
}): Promise<ChannelVideosPage | null> {
  const lookup = normalizeChannelLookup(channelId);
  let channel: ChannelLike | null = await loadChannel(lookup);
  if (!channel) {
    channel = await withRetries("getChannel", () => fetchChannelRaw(lookup));
  }
  if (!channel || typeof channel.getVideos !== "function") {
    return null;
  }

  const about = await loadAbout(channel);
  const details = detailsFromChannel(channel, about, lookup);
  if (!details) return null;

  const pageNumber = normalizePageToken(pageToken);
  const videosFeed =
    (await withRetries("getVideos", () => channel!.getVideos!() as Promise<FeedLike>)) ??
    null;
  if (!videosFeed) return null;

  const sortedFeed = await sortedVideosFeed(videosFeed, sort);
  const { feed: pageStart, continuationFailed: pageWalkFailed } = await feedAtPage(
    sortedFeed,
    pageNumber,
  );

  const maxHops =
    pageNumber === 1
      ? ROBUST_PAGE1_MAX_CONTINUATIONS
      : ROBUST_DEEP_PAGE_MAX_CONTINUATIONS;
  const {
    videos: collected,
    endFeed,
    rawItemCount,
    lostItems,
  } = await collectMappedAcrossContinuations(
    pageStart,
    limit,
    channelFeedVideoToVideoLike,
    maxHops,
  );

  const videos = collected.map((v) => withChannelName(v, details));

  const gridSourceLostItems = lostItems;
  if (channelVideosDebugEnabled() && rawItemCount > 0 && videos.length === 0) {
    console.warn("[channel videos] robust: raw feed items but none mapped", {
      rawItemCount,
      pageNumber,
      sort,
    });
  }

  const hasNext = Boolean(
    endFeed.has_continuation && typeof endFeed.getContinuation === "function",
  );
  const totalPages = totalPagesFromVideoCount(details.videoCountText, limit);

  let emptyGridHint = emptyGridHintFromSignals({
    videoCount: videos.length,
    hasNext,
    rawItemCount,
    continuationFailed: pageWalkFailed,
    lostItems: gridSourceLostItems,
  });
  emptyGridHint = refineEmptyHint(
    emptyGridHint,
    details.videoCountText,
    hasNext,
  );

  const gridPartialLoad = pageWalkFailed || (pageNumber > 1 && videos.length === 0);

  return {
    channel: details,
    videos,
    sort,
    pageToken: String(pageNumber),
    nextPageToken: hasNext ? String(pageNumber + 1) : undefined,
    previousPageToken: pageNumber > 1 ? String(pageNumber - 1) : undefined,
    totalPages:
      totalPages == null
        ? undefined
        : Math.max(totalPages, hasNext ? pageNumber + 1 : pageNumber),
    emptyGridHint: videos.length > 0 ? "none" : emptyGridHint,
    gridPartialLoad,
    gridSourceLostItems: videos.length === 0 ? gridSourceLostItems : false,
  };
}

export const youtubeiChannelBackend: ChannelBackend = {
  async getChannelDetails(channelIdOrUrl) {
    const lookup = normalizeChannelLookup(channelIdOrUrl);
    const channel = await loadChannel(lookup);
    if (!channel) return null;
    const about = await loadAbout(channel);
    return detailsFromChannel(channel, about, lookup);
  },

  async getChannelVideos({
    channelId,
    sort = "latest",
    pageToken,
    limit = DEFAULT_PAGE_SIZE,
  }) {
    const lookup = normalizeChannelLookup(channelId);
    const channel = await loadChannel(lookup);
    if (!channel || typeof channel.getVideos !== "function") {
      return null;
    }

    const about = await loadAbout(channel);
    const details = detailsFromChannel(channel, about, lookup);
    if (!details) return null;

    const pageNumber = normalizePageToken(pageToken);
    const videosFeed = await channel.getVideos();
    const sortedFeed = await sortedVideosFeed(videosFeed, sort);
    const { feed, continuationFailed: pageWalkFailed } = await feedAtPage(
      sortedFeed,
      pageNumber,
    );
    const rawLen = feed.videos?.length ?? 0;
    const hasNext = Boolean(
      feed.has_continuation && typeof feed.getContinuation === "function",
    );
    const totalPages = totalPagesFromVideoCount(details.videoCountText, limit);

    const videos = videosFromFeed(feed, limit, feedVideoToVideoLike).map((video) =>
      withChannelName(video, details),
    );

    let emptyGridHint = emptyGridHintFromSignals({
      videoCount: videos.length,
      hasNext,
      rawItemCount: rawLen,
      continuationFailed: pageWalkFailed,
      lostItems: rawLen > 0 && videos.length === 0,
    });
    emptyGridHint = refineEmptyHint(
      emptyGridHint,
      details.videoCountText,
      hasNext,
    );

    const gridPartialLoad =
      pageWalkFailed || (pageNumber > 1 && videos.length === 0);

    return {
      channel: details,
      videos,
      sort,
      pageToken: String(pageNumber),
      nextPageToken: hasNext ? String(pageNumber + 1) : undefined,
      previousPageToken: pageNumber > 1 ? String(pageNumber - 1) : undefined,
      totalPages:
        totalPages == null
          ? undefined
          : Math.max(totalPages, hasNext ? pageNumber + 1 : pageNumber),
      emptyGridHint: videos.length > 0 ? "none" : emptyGridHint,
      gridPartialLoad,
      gridSourceLostItems: rawLen > 0 && videos.length === 0,
    };
  },
};

export async function getChannelVideosPage(
  input: {
    channelId: string;
    sort?: ChannelSortMode;
    pageToken?: string;
    limit?: number;
  },
  options?: { variant?: ChannelVideosVariant },
): Promise<ChannelVideosPage | null> {
  const variant = options?.variant ?? "legacy";
  if (variant === "v2") {
    return getChannelVideosRobustInner(input);
  }
  return youtubeiChannelBackend.getChannelVideos(input);
}

const CHANNEL_VIDEOS_CACHE_SECONDS = (() => {
  const raw = process.env.CHANNEL_VIDEOS_CACHE_SECONDS;
  const n = raw ? Number.parseInt(raw, 10) : 3600;
  if (!Number.isFinite(n)) return 3600;
  return Math.min(Math.max(n, 60), 86400);
})();

/**
 * Cached channel grid for Data Cache (helps when the route is dynamic due to cookies).
 * Failures are not stored: empty InnerTube responses fall through to a live retry.
 */
export async function getChannelVideosPageCached(
  input: {
    channelId: string;
    sort?: ChannelSortMode;
    pageToken?: string;
    limit?: number;
  },
  options?: { variant?: ChannelVideosVariant },
): Promise<ChannelVideosPage | null> {
  const sort = input.sort ?? "latest";
  const variant = options?.variant ?? "legacy";
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const pageKey = input.pageToken ?? "";
  const cacheTags = [
    "cleantube-channel-videos",
    input.channelId,
    sort,
    pageKey,
    variant,
    String(limit),
  ];

  try {
    return await unstable_cache(
      async () => {
        const page = await getChannelVideosPage(input, options);
        if (!page) throw new Error("channel_videos_miss");
        return page;
      },
      cacheTags,
      { revalidate: CHANNEL_VIDEOS_CACHE_SECONDS },
    )();
  } catch {
    return getChannelVideosPage(input, options);
  }
}

export async function getChannelDetails(
  channelIdOrUrl: string,
): Promise<ChannelDetails | null> {
  return youtubeiChannelBackend.getChannelDetails(channelIdOrUrl);
}
