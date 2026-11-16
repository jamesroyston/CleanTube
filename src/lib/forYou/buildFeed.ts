import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { effectiveSavedChannelKind } from "@/types/savedChannel";

import { fetchForYouCandidates, recentHistorySeeds } from "./fetchCandidates";
import type { ForYouLibrarySignals } from "./loadLibrarySignals";
import {
  forYouHasLibrarySignals,
  rankForYouCandidates,
} from "./recommendations";
import {
  forYouDayKey,
  recentSearchesForFeed,
  selectSavedChannelsForFeed,
} from "./selection";
import type {
  ForYouCandidate,
  ForYouCandidateSource,
  ForYouFeedResult,
  ForYouSection,
} from "./types";
import { DEFAULT_FOR_YOU_LIMITS } from "./types";

function normalizeSeedName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeSearchQuery(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function candidatesForSeed(
  pool: ForYouCandidate[],
  source: ForYouCandidateSource,
  seedName: string,
): ForYouCandidate[] {
  const key = normalizeSeedName(seedName);
  return pool.filter(
    (c) => c.source === source && normalizeSeedName(c.seedChannelName) === key,
  );
}

function rankSection(
  candidates: ForYouCandidate[],
  snapshot: CloudSnapshot,
  maxResults: number,
  rotationKey: string,
  dismissedVideoIds: readonly string[],
  excludeVideoIds?: ReadonlySet<string>,
): ForYouSection["videos"] {
  const pool = excludeVideoIds?.size
    ? candidates.filter((candidate) => {
        const id = candidate.video.id?.trim();
        return Boolean(id) && !excludeVideoIds.has(id);
      })
    : candidates;
  const ranked = rankForYouCandidates(
    pool,
    snapshot.savedChannels,
    snapshot.watchProgress,
    { ...DEFAULT_FOR_YOU_LIMITS, maxResults },
    { rotationKey, dismissedVideoIds },
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

function buildChannelSections(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
  rotationKey: string,
  dismissedVideoIds: readonly string[],
): ForYouSection[] {
  const channelEntries = selectSavedChannelsForFeed(
    snapshot.savedChannels,
    snapshot.watchProgress,
    limits.maxSavedChannels,
    rotationKey,
  );

  const sections: ForYouSection[] = [];
  for (const channel of channelEntries) {
    const candidates = candidatesForSeed(pool, "saved_channel", channel.name);
    const videos = rankSection(
      candidates,
      snapshot,
      limits.maxVideosPerChannel,
      rotationKey,
      dismissedVideoIds,
    );
    if (videos.length === 0) continue;
    sections.push({
      id: `channel-${channel.id}`,
      title: `From ${channel.name}`,
      videos,
    });
  }
  return sections;
}

function truncateSeedTitle(title: string, max = 56): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function buildBecauseYouWatchedSections(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
  rotationKey: string,
  dismissedVideoIds: readonly string[],
): ForYouSection[] {
  const seeds = recentHistorySeeds(
    snapshot.watchProgress,
    limits.maxHistorySeeds,
  );
  const sections: ForYouSection[] = [];

  for (const seed of seeds) {
    const candidates = pool.filter(
      (c) => c.source === "watch_next" && c.seedVideoId === seed.videoId,
    );
    const videos = rankSection(
      candidates,
      snapshot,
      limits.maxVideosPerWatchNext,
      rotationKey,
      dismissedVideoIds,
    );
    if (videos.length === 0) continue;

    const label = truncateSeedTitle(
      seed.title || seed.channelName || "a video",
    );
    sections.push({
      id: `because-you-watched-${seed.videoId}`,
      title: `Because you watched: ${label}`,
      videos,
    });
  }

  return sections;
}

function buildPinnedSearchSections(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
  rotationKey: string,
  dismissedVideoIds: readonly string[],
): ForYouSection[] {
  const pins = snapshot.savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "pinned_search")
    .slice(0, limits.maxPinnedSearches);

  const sections: ForYouSection[] = [];
  for (const pin of pins) {
    const candidates = candidatesForSeed(pool, "pinned_search", pin.name);
    const videos = rankSection(
      candidates,
      snapshot,
      limits.maxVideosPerSearch,
      rotationKey,
      dismissedVideoIds,
    );
    if (videos.length === 0) continue;
    sections.push({
      id: `pin-${pin.id}`,
      title: `From pinned search: ${pin.name}`,
      videos,
    });
  }
  return sections;
}

function buildRecentSearchSections(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  recentSearches: ForYouLibrarySignals["recentSearches"],
  mutedSearchQueries: string[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
  rotationKey: string,
  dismissedVideoIds: readonly string[],
): ForYouSection[] {
  const queries = recentSearchesForFeed(
    recentSearches,
    undefined,
    mutedSearchQueries,
  );
  const sections: ForYouSection[] = [];

  for (const entry of queries) {
    const queryKey = normalizeSearchQuery(entry.query);
    const candidates = pool.filter(
      (c) =>
        c.source === "recent_search" &&
        normalizeSearchQuery(c.seedSearchQuery) === queryKey,
    );
    const videos = rankSection(
      candidates,
      snapshot,
      limits.maxVideosPerSearch,
      rotationKey,
      dismissedVideoIds,
    );
    if (videos.length === 0) continue;

    sections.push({
      id: `recent-search-${hashSectionId(entry.query)}`,
      title: `From search: ${entry.query}`,
      seedSearchQuery: entry.query,
      videos,
    });
  }

  return sections;
}

function hashSectionId(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function usedVideoIds(sections: ForYouSection[]): Set<string> {
  const used = new Set<string>();
  for (const section of sections) {
    for (const video of section.videos) used.add(video.id);
  }
  return used;
}

function buildMoreForYouSection(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
  rotationKey: string,
  dismissedVideoIds: readonly string[],
  excludeVideoIds: ReadonlySet<string>,
): ForYouSection | null {
  const videos = rankSection(
    pool,
    snapshot,
    limits.maxResults,
    rotationKey,
    dismissedVideoIds,
    excludeVideoIds,
  );
  if (videos.length === 0) return null;

  return {
    id: "more-for-you",
    title: "More for you",
    videos,
  };
}

export async function buildForYouFeed(
  signals: ForYouLibrarySignals,
  rotationKey?: string,
): Promise<ForYouFeedResult> {
  const { snapshot, recentSearches, recentSearchQueries, mutedSearchQueries } =
    signals;
  const dismissedVideoIds = signals.dismissedVideoIds ?? [];
  const limits = DEFAULT_FOR_YOU_LIMITS;
  const dayKey = forYouDayKey();
  const rotation = rotationKey?.trim() || dayKey;

  if (
    !forYouHasLibrarySignals(
      snapshot.savedChannels,
      snapshot.watchProgress,
      recentSearchQueries,
    )
  ) {
    return { sections: [], empty: true, generatedDayKey: dayKey };
  }

  const pool = await fetchForYouCandidates(
    snapshot,
    recentSearches,
    limits,
    rotation,
    mutedSearchQueries,
  );

  const channelSections = buildChannelSections(
    snapshot,
    pool,
    limits,
    rotation,
    dismissedVideoIds,
  );
  const becauseYouWatchedSections = buildBecauseYouWatchedSections(
    snapshot,
    pool,
    limits,
    rotation,
    dismissedVideoIds,
  );
  const pinnedSections = buildPinnedSearchSections(
    snapshot,
    pool,
    limits,
    rotation,
    dismissedVideoIds,
  );
  const recentSections = buildRecentSearchSections(
    snapshot,
    pool,
    recentSearches,
    mutedSearchQueries,
    limits,
    rotation,
    dismissedVideoIds,
  );

  const primary = dedupeSections([
    ...becauseYouWatchedSections,
    ...channelSections,
    ...pinnedSections,
    ...recentSections,
  ]);
  const moreSection = buildMoreForYouSection(
    snapshot,
    pool,
    limits,
    rotation,
    dismissedVideoIds,
    usedVideoIds(primary),
  );

  const sections = moreSection ? [...primary, moreSection] : primary;
  return {
    sections,
    empty: sections.length === 0,
    generatedDayKey: dayKey,
  };
}
