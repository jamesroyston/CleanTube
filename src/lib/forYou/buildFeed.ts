import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { entriesToQueryList } from "@/lib/cloudRecentSearches/sync";
import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { SavedChannel } from "@/types/savedChannel";

import {
  fetchForYouCandidates,
  fetchFromHistorySeed,
  fetchFromPinnedSearch,
  fetchFromRecentSearch,
  fetchFromSavedChannel,
  recentHistorySeeds,
} from "./fetchCandidates";
import type { ForYouLibrarySignals } from "./loadLibrarySignals";
import {
  forYouHasLibrarySignals,
  rankForYouCandidates,
} from "./recommendations";
import type { ForYouCandidate, ForYouFeedResult, ForYouSection } from "./types";
import { DEFAULT_FOR_YOU_LIMITS } from "./types";

const SECTION_CONCURRENCY = 3;

async function mapWithBoundedConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function rankSection(
  candidates: ForYouCandidate[],
  snapshot: CloudSnapshot,
  maxResults: number,
): ForYouSection["videos"] {
  const ranked = rankForYouCandidates(
    candidates,
    snapshot.savedChannels,
    snapshot.watchProgress,
    { ...DEFAULT_FOR_YOU_LIMITS, maxResults },
  );
  return toVideoSummaries(ranked);
}

function dedupeSections(
  sections: ForYouSection[],
  extra?: ForYouSection,
): ForYouSection[] {
  const seen = new Set<string>();
  const out: ForYouSection[] = [];

  const absorb = (section: ForYouSection) => {
    const videos = section.videos.filter((video) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
    if (videos.length > 0) {
      out.push({ ...section, videos });
    }
  };

  for (const section of sections) absorb(section);
  if (extra) absorb(extra);
  return out;
}

async function buildChannelSections(
  snapshot: CloudSnapshot,
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): Promise<ForYouSection[]> {
  const channelEntries = snapshot.savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "saved_channel")
    .slice(0, limits.maxSavedChannels);

  const built = await mapWithBoundedConcurrency(
    channelEntries,
    SECTION_CONCURRENCY,
    async (channel: SavedChannel) => {
      const candidates = await fetchFromSavedChannel(channel, limits);
      const videos = rankSection(
        candidates,
        snapshot,
        limits.maxVideosPerChannel,
      );
      if (videos.length === 0) return null;
      return {
        id: `channel-${channel.id}`,
        title: `From ${channel.name}`,
        videos,
      } satisfies ForYouSection;
    },
  );

  return built.filter((section): section is ForYouSection => section != null);
}

async function buildBecauseYouWatchedSection(
  snapshot: CloudSnapshot,
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): Promise<ForYouSection | null> {
  const seeds = recentHistorySeeds(
    snapshot.watchProgress,
    limits.maxHistorySeeds,
  );
  if (seeds.length === 0) return null;

  const groups = await mapWithBoundedConcurrency(seeds, SECTION_CONCURRENCY, (entry) =>
    fetchFromHistorySeed(entry, limits),
  );
  const candidates = groups.flat();
  const videos = rankSection(candidates, snapshot, 24);
  if (videos.length === 0) return null;

  return {
    id: "because-you-watched",
    title: "Because you watched",
    videos,
  };
}

async function buildPinnedSearchSections(
  snapshot: CloudSnapshot,
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): Promise<ForYouSection[]> {
  const pins = snapshot.savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "pinned_search")
    .slice(0, limits.maxSavedChannels);

  const built = await mapWithBoundedConcurrency(pins, SECTION_CONCURRENCY, async (pin) => {
    const candidates = await fetchFromPinnedSearch(pin, limits);
    const videos = rankSection(candidates, snapshot, limits.maxVideosPerSearch);
    if (videos.length === 0) return null;
    return {
      id: `pin-${pin.id}`,
      title: `From pinned search: ${pin.name}`,
      videos,
    } satisfies ForYouSection;
  });

  return built.filter((section): section is ForYouSection => section != null);
}

async function buildRecentSearchSection(
  recentSearches: RecentSearchEntry[],
  snapshot: CloudSnapshot,
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): Promise<ForYouSection | null> {
  const queries = entriesToQueryList(recentSearches).slice(0, 3);
  if (queries.length === 0) return null;

  const groups = await mapWithBoundedConcurrency(queries, SECTION_CONCURRENCY, (query) =>
    fetchFromRecentSearch(query, limits),
  );
  const candidates = groups.flat();
  const videos = rankSection(candidates, snapshot, 16);
  if (videos.length === 0) return null;

  return {
    id: "recent-searches",
    title: "From your recent searches",
    videos,
  };
}

async function buildMoreForYouSection(
  snapshot: CloudSnapshot,
  recentSearches: RecentSearchEntry[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): Promise<ForYouSection | null> {
  const candidates = await fetchForYouCandidates(snapshot, recentSearches, limits);
  const videos = rankSection(candidates, snapshot, limits.maxResults);
  if (videos.length === 0) return null;

  return {
    id: "more-for-you",
    title: "More for you",
    videos,
  };
}

export async function buildForYouFeed(
  signals: ForYouLibrarySignals,
): Promise<ForYouFeedResult> {
  const { snapshot, recentSearches, recentSearchQueries } = signals;
  const limits = DEFAULT_FOR_YOU_LIMITS;

  if (
    !forYouHasLibrarySignals(
      snapshot.savedChannels,
      snapshot.watchProgress,
      recentSearchQueries,
    )
  ) {
    return { sections: [], empty: true };
  }

  const [channelSections, becauseYouWatched, pinnedSections, recentSection, moreSection] =
    await Promise.all([
      buildChannelSections(snapshot, limits),
      buildBecauseYouWatchedSection(snapshot, limits),
      buildPinnedSearchSections(snapshot, limits),
      buildRecentSearchSection(recentSearches, snapshot, limits),
      buildMoreForYouSection(snapshot, recentSearches, limits),
    ]);

  const primary = [
    ...channelSections,
    ...(becauseYouWatched ? [becauseYouWatched] : []),
    ...pinnedSections,
    ...(recentSection ? [recentSection] : []),
  ];

  const sections = dedupeSections(primary, moreSection ?? undefined);
  return {
    sections,
    empty: sections.length === 0,
  };
}
