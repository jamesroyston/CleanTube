import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";
import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { searchMixedResultsCached } from "@/lib/youtubeSearchCache";
import { getChannelVideosPageCached } from "@/lib/youtubeChannel";
import { getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
import { getWatchNextRelatedVideos } from "@/lib/youtubeWatchNext";
import { extractHighConfidenceChannelLookup } from "@/lib/youtubeUrl";
import type { SavedChannel } from "@/types/savedChannel";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { WatchProgressEntry } from "@/types/watchProgress";
import {
  forYouDayKey,
  isRecentEnoughHistorySeed,
  recentSearchesForFeed,
  selectSavedChannelsForFeed,
} from "./selection";
import type { ForYouCandidate, ForYouFeedLimits } from "./types";
import { DEFAULT_FOR_YOU_LIMITS } from "./types";

const FETCH_CONCURRENCY = 6;

/**
 * Per-source budget. 3s was dropping every cold channel lookup, so the feed
 * often survived as a single cached channel. Slow calls still can't hold
 * the request open past this.
 */
const SOURCE_FETCH_TIMEOUT_MS = 8_000;

/** Watch-next (`getInfo`) is often bot-challenged from datacenter IPs. */
const WATCH_NEXT_TIMEOUT_MS = 5_000;
const RELATED_SEARCH_TIMEOUT_MS = 4_000;

/** First channel grid page is ~30 videos; map extra so ranking can rotate. */
const CHANNEL_POOL_MIN = 24;
const SEARCH_POOL_MIN = 16;
const WATCH_NEXT_POOL_MIN = 16;

const WATCH_NEXT_FAILURE_THRESHOLD = 2;
const WATCH_NEXT_COOLDOWN_MS = 15 * 60 * 1000;

/** Per warm server instance. */
const watchNextBreaker = {
  consecutiveFailures: 0,
  openUntil: 0,
  probeInFlight: false,
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then(resolve, () => resolve(fallback))
      .finally(() => clearTimeout(timer));
  });
}

/** After the cooldown, a single probe call decides whether to close the breaker. */
function acquireWatchNextSlot(): boolean {
  const b = watchNextBreaker;
  if (b.consecutiveFailures < WATCH_NEXT_FAILURE_THRESHOLD) return true;
  if (b.probeInFlight || Date.now() < b.openUntil) return false;
  b.probeInFlight = true;
  return true;
}

function recordWatchNextResult(ok: boolean): void {
  const b = watchNextBreaker;
  b.probeInFlight = false;
  if (ok) {
    b.consecutiveFailures = 0;
    b.openUntil = 0;
    return;
  }
  b.consecutiveFailures += 1;
  if (b.consecutiveFailures >= WATCH_NEXT_FAILURE_THRESHOLD) {
    b.openUntil = Date.now() + WATCH_NEXT_COOLDOWN_MS;
  }
}

async function mapWithBoundedConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function channelPoolLimit(limits: ForYouFeedLimits): number {
  return Math.max(limits.maxVideosPerChannel, CHANNEL_POOL_MIN);
}

function searchPoolLimit(limits: ForYouFeedLimits): number {
  return Math.min(50, Math.max(limits.maxVideosPerSearch, SEARCH_POOL_MIN));
}

function watchNextPoolLimit(limits: ForYouFeedLimits): number {
  return Math.max(limits.maxVideosPerWatchNext, WATCH_NEXT_POOL_MIN);
}

function channelLookupForSaved(channel: SavedChannel): string | null {
  const id = channel.channelId?.trim();
  if (id) return id;
  const url = channel.channelUrl?.trim();
  if (url) return extractHighConfidenceChannelLookup(url);
  return null;
}

async function resolveChannelIdForFetch(
  channel: SavedChannel,
): Promise<string | null> {
  const direct = channelLookupForSaved(channel);
  if (direct) return direct;

  const query = channel.searchQuery?.trim() || channel.name?.trim();
  if (!query) return null;

  try {
    const details = await getChannelDetailsCached(query);
    return details?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchFromSavedChannel(
  channel: SavedChannel,
  limits: ForYouFeedLimits,
): Promise<ForYouCandidate[]> {
  const channelId = await resolveChannelIdForFetch(channel);
  if (!channelId) {
    const query = channel.searchQuery?.trim() || channel.name?.trim();
    if (!query) return [];
    try {
      const results = await searchMixedResultsCached(
        query,
        searchPoolLimit(limits),
        "newest",
      );
      return results.videos.map((video) => ({
        video,
        source: "saved_channel" as const,
        seedChannelName: channel.name,
      }));
    } catch {
      return [];
    }
  }

  try {
    const page = await getChannelVideosPageCached({
      channelId,
      sort: "latest",
      limit: channelPoolLimit(limits),
    });
    if (!page?.videos.length) return [];
    return page.videos.map((video) => ({
      video,
      source: "saved_channel" as const,
      seedChannelName: channel.name,
    }));
  } catch {
    return [];
  }
}

export async function fetchFromPinnedSearch(
  channel: SavedChannel,
  limits: ForYouFeedLimits,
): Promise<ForYouCandidate[]> {
  const query = channel.searchQuery?.trim() || channel.name?.trim();
  if (!query) return [];
  try {
    const results = await searchMixedResultsCached(
      query,
      searchPoolLimit(limits),
      "newest",
    );
    return results.videos.map((video) => ({
      video,
      source: "pinned_search" as const,
      seedChannelName: channel.name,
    }));
  } catch {
    return [];
  }
}

export function recentHistorySeeds(
  watchProgress: WatchProgressEntry[],
  max: number,
): WatchProgressEntry[] {
  return [...watchProgress]
    .filter((entry) => isRecentEnoughHistorySeed(entry))
    .sort((a, b) => {
      const ta = Date.parse(a.lastWatchedAt);
      const tb = Date.parse(b.lastWatchedAt);
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    })
    .slice(0, max);
}

function toWatchNextCandidates(
  videos: Awaited<ReturnType<typeof getWatchNextRelatedVideos>>,
  entry: WatchProgressEntry,
  limit: number,
): ForYouCandidate[] {
  const seedId = entry.videoId.trim();
  return videos
    .filter((video) => video.id && video.id !== seedId)
    .slice(0, limit)
    .map((video) => ({
      video,
      source: "watch_next" as const,
      seedChannelName: entry.channelName,
      seedVideoId: entry.videoId,
      seedHistoryTitle: entry.title,
    }));
}

/** Title search when the sidebar rail is empty or the breaker is open. */
async function fetchRelatedSearchFallback(
  entry: WatchProgressEntry,
  limits: ForYouFeedLimits,
): Promise<ForYouCandidate[]> {
  const query = entry.title?.trim().slice(0, 140);
  if (!query) return [];
  try {
    const results = await searchMixedResultsCached(
      query,
      watchNextPoolLimit(limits),
      "relevance",
    );
    return toWatchNextCandidates(
      results.videos,
      entry,
      watchNextPoolLimit(limits),
    );
  } catch {
    return [];
  }
}

export async function fetchFromHistorySeed(
  entry: WatchProgressEntry,
  limits: ForYouFeedLimits,
): Promise<ForYouCandidate[]> {
  const poolLimit = watchNextPoolLimit(limits);
  let related: Awaited<ReturnType<typeof getWatchNextRelatedVideos>> = [];

  if (acquireWatchNextSlot()) {
    try {
      related = await withTimeout(
        getWatchNextRelatedVideos(entry.videoId),
        WATCH_NEXT_TIMEOUT_MS,
        [],
      );
      recordWatchNextResult(related.length > 0);
    } catch {
      recordWatchNextResult(false);
      related = [];
    }
  }

  const mapped =
    related.length > 0 ? toWatchNextCandidates(related, entry, poolLimit) : [];
  if (mapped.length > 0) return mapped;

  return withTimeout(
    fetchRelatedSearchFallback(entry, limits),
    RELATED_SEARCH_TIMEOUT_MS,
    [],
  );
}

export async function fetchFromRecentSearch(
  query: string,
  limits: ForYouFeedLimits,
): Promise<ForYouCandidate[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const results = await searchMixedResultsCached(
      q,
      searchPoolLimit(limits),
      "relevance",
    );
    return results.videos.map((video) => ({
      video,
      source: "recent_search" as const,
      seedSearchQuery: q,
    }));
  } catch {
    return [];
  }
}

export async function fetchForYouCandidates(
  snapshot: CloudSnapshot,
  recentSearches: RecentSearchEntry[],
  limits: ForYouFeedLimits = DEFAULT_FOR_YOU_LIMITS,
  rotationKey: string = forYouDayKey(),
  mutedSearchQueries: string[] = [],
): Promise<ForYouCandidate[]> {
  const savedChannels = snapshot.savedChannels;
  const channelEntries = selectSavedChannelsForFeed(
    savedChannels,
    snapshot.watchProgress,
    limits.maxSavedChannels,
    rotationKey,
  );
  const pinnedSearches = savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "pinned_search")
    .slice(0, limits.maxPinnedSearches);

  const historySeeds = recentHistorySeeds(
    snapshot.watchProgress,
    limits.maxHistorySeeds,
  );

  const recentQueries = recentSearchesForFeed(
    recentSearches,
    undefined,
    mutedSearchQueries,
  ).map((entry) => entry.query);

  const bounded = (request: Promise<ForYouCandidate[]>) =>
    withTimeout(request, SOURCE_FETCH_TIMEOUT_MS, []);

  const batches = await Promise.all([
    mapWithBoundedConcurrency(channelEntries, FETCH_CONCURRENCY, (ch) =>
      bounded(fetchFromSavedChannel(ch, limits)),
    ),
    mapWithBoundedConcurrency(pinnedSearches, FETCH_CONCURRENCY, (ch) =>
      bounded(fetchFromPinnedSearch(ch, limits)),
    ),
    // Time-bounded internally so the breaker sees timeouts as failures.
    mapWithBoundedConcurrency(historySeeds, FETCH_CONCURRENCY, (entry) =>
      fetchFromHistorySeed(entry, limits),
    ),
    mapWithBoundedConcurrency(recentQueries, FETCH_CONCURRENCY, (q) =>
      bounded(fetchFromRecentSearch(q, limits)),
    ),
  ]);

  return batches.flatMap((group) => group.flat());
}
