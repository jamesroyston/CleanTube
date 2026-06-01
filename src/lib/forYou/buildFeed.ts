import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { effectiveSavedChannelKind } from "@/types/savedChannel";

import { fetchForYouCandidates, recentHistorySeeds } from "./fetchCandidates";
import type { ForYouLibrarySignals } from "./loadLibrarySignals";
import {
  forYouHasLibrarySignals,
  rankForYouCandidates,
} from "./recommendations";
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

function candidatesBySource(
  pool: ForYouCandidate[],
  source: ForYouCandidateSource,
): ForYouCandidate[] {
  return pool.filter((c) => c.source === source);
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
): ForYouSection[] {
  const channelEntries = snapshot.savedChannels
    .filter((c) => effectiveSavedChannelKind(c) === "saved_channel")
    .slice(0, limits.maxSavedChannels);

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

function buildRecentSearchSection(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
): ForYouSection | null {
  const candidates = candidatesBySource(pool, "recent_search");
  const videos = rankSection(candidates, snapshot, 16);
  if (videos.length === 0) return null;

  return {
    id: "recent-searches",
    title: "From your recent searches",
    videos,
  };
}

function buildSavedChannelShortsSection(
  snapshot: CloudSnapshot,
  pool: ForYouCandidate[],
  limits: typeof DEFAULT_FOR_YOU_LIMITS,
): ForYouSection | null {
  const shorts = pool.filter(
    (c) =>
      c.source === "saved_channel_shorts" &&
      (c.video.kind ?? "video") === "short",
  );
  const videos = rankSection(shorts, snapshot, limits.maxShortsResults);
  if (videos.length === 0) return null;
  return {
    id: "shorts-from-subscriptions",
    title: "Shorts from your subscriptions",
    videos,
  };
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

  if (
    !forYouHasLibrarySignals(
      snapshot.savedChannels,
      snapshot.watchProgress,
      recentSearchQueries,
    )
  ) {
    return { sections: [], empty: true };
  }

  const pool = await fetchForYouCandidates(snapshot, recentSearches, limits);

  const channelSections = buildChannelSections(snapshot, pool, limits);
  const becauseYouWatchedSections = buildBecauseYouWatchedSections(
    snapshot,
    pool,
    limits,
  );
  const pinnedSections = buildPinnedSearchSections(snapshot, pool, limits);
  const shortsSection = buildSavedChannelShortsSection(snapshot, pool, limits);
  const recentSection = buildRecentSearchSection(snapshot, pool);
  const moreSection = buildMoreForYouSection(snapshot, pool, limits);

  const primary = [
    ...channelSections,
    ...becauseYouWatchedSections,
    ...(shortsSection ? [shortsSection] : []),
    ...pinnedSections,
    ...(recentSection ? [recentSection] : []),
  ];

  const sections = dedupeSections(primary, moreSection ?? undefined);
  return {
    sections,
    empty: sections.length === 0,
  };
}
