import { entriesToQueryList } from "@/lib/cloudRecentSearches/sync";
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
import type { ForYouCandidate, ForYouFeedLimits } from "./types";
import { DEFAULT_FOR_YOU_LIMITS } from "./types";

const FETCH_CONCURRENCY = 4;

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
        limits.maxVideosPerSearch,
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
      limit: limits.maxVideosPerChannel,
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
      limits.maxVideosPerSearch,
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
    .sort((a, b) => {
      const ta = Date.parse(a.lastWatchedAt);
      const tb = Date.parse(b.lastWatchedAt);
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    })
    .slice(0, max);
}

export async function fetchFromHistorySeed(
  entry: WatchProgressEntry,
  limits: ForYouFeedLimits,
): Promise<ForYouCandidate[]> {
  try {
    const related = await getWatchNextRelatedVideos(entry.videoId);
    return related.slice(0, limits.maxVideosPerWatchNext).map((video) => ({
      video,
      source: "watch_next" as const,
      seedChannelName: entry.channelName,
    }));
  } catch {
    return [];
  }
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
      limits.maxVideosPerSearch,
      "relevance",
    );
    return results.videos.map((video) => ({
      video,
      source: "recent_search" as const,
    }));
  } catch {
    return [];
  }
}

export async function fetchForYouCandidates(
  snapshot: CloudSnapshot,
  recentSearches: RecentSearchEntry[],
  limits: ForYouFeedLimits = DEFAULT_FOR_YOU_LIMITS,
): Promise<ForYouCandidate[]> {
  const savedChannels = snapshot.savedChannels;
  const channelEntries = savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "saved_channel")
    .slice(0, limits.maxSavedChannels);
  const pinnedSearches = savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "pinned_search")
    .slice(0, limits.maxSavedChannels);

  const historySeeds = recentHistorySeeds(
    snapshot.watchProgress,
    limits.maxHistorySeeds,
  );

  const recentQueries = entriesToQueryList(recentSearches).slice(0, 5);

  const batches = await Promise.all([
    mapWithBoundedConcurrency(channelEntries, FETCH_CONCURRENCY, (ch) =>
      fetchFromSavedChannel(ch, limits),
    ),
    mapWithBoundedConcurrency(pinnedSearches, FETCH_CONCURRENCY, (ch) =>
      fetchFromPinnedSearch(ch, limits),
    ),
    mapWithBoundedConcurrency(historySeeds, FETCH_CONCURRENCY, (entry) =>
      fetchFromHistorySeed(entry, limits),
    ),
    mapWithBoundedConcurrency(recentQueries, FETCH_CONCURRENCY, (q) =>
      fetchFromRecentSearch(q, limits),
    ),
  ]);

  return batches.flatMap((group) => group.flat());
}
