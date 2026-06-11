import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { SavedChannel } from "@/types/savedChannel";

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

function buildChannelSections(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
  dayKey: string,
): ForYouSection[] {
  const channelEntries = selectSavedChannelsForFeed(
    snapshot.savedChannels,
    snapshot.watchProgress,
    limits.maxSavedChannels,
    dayKey,
  );

  const sections: ForYouSection[] = [];
  for (const channel of channelEntries) {
    const candidates = candidatesForSeed(pool, "saved_channel", channel.name);
    const videos = rankSection(
      candidates,
      snapshot,
      limits.maxVideosPerChannel,
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
): ForYouSection[] {
  const pins = snapshot.savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "pinned_search")
    .slice(0, limits.maxSavedChannels);

  const sections: ForYouSection[] = [];
  for (const pin of pins) {
    const candidates = candidatesForSeed(pool, "pinned_search", pin.name);
    const videos = rankSection(candidates, snapshot, limits.maxVideosPerSearch);
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
): ForYouSection[] {
  const queries = recentSearchesForFeed(recentSearches);
  const sections: ForYouSection[] = [];

  for (const entry of queries) {
    const queryKey = normalizeSearchQuery(entry.query);
    const candidates = pool.filter(
      (c) =>
        c.source === "recent_search" &&
        normalizeSearchQuery(c.seedSearchQuery) === queryKey,
    );
    const videos = rankSection(candidates, snapshot, 8);
    if (videos.length === 0) continue;

    sections.push({
      id: `recent-search-${hashSectionId(entry.query)}`,
      title: `From search: ${entry.query}`,
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

function buildMoreForYouSection(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): ForYouSection | null {
  const videos = rankSection(pool, snapshot, limits.maxResults);
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
  const dayKey = forYouDayKey();

  if (
    !forYouHasLibrarySignals(
      snapshot.savedChannels,
      snapshot.watchProgress,
      recentSearchQueries,
    )
  ) {
    return { sections: [], empty: true };
  }

  const pool = await fetchForYouCandidates(
    snapshot,
    recentSearches,
    limits,
    dayKey,
  );

  const channelSections = buildChannelSections(snapshot, pool, limits, dayKey);
  const becauseYouWatchedSections = buildBecauseYouWatchedSections(
    snapshot,
    pool,
    limits,
  );
  const pinnedSections = buildPinnedSearchSections(snapshot, pool, limits);
  const recentSections = buildRecentSearchSections(
    snapshot,
    pool,
    recentSearches,
  );
  const moreSection = buildMoreForYouSection(snapshot, pool, limits);

  const primary = [
    ...becauseYouWatchedSections,
    ...channelSections,
    ...pinnedSections,
    ...recentSections,
  ];

  const sections = dedupeSections(primary, moreSection ?? undefined);
  return {
    sections,
    empty: sections.length === 0,
  };
}
