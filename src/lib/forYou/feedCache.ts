import { cacheLife, cacheTag } from "next/cache";

import { buildForYouFeed } from "./buildFeed";
import type { ForYouLibrarySignals } from "./loadLibrarySignals";
import { forYouDayKey } from "./selection";
import type { ForYouFeedResult } from "./types";

/** Per-user feed cache TTL (default 10 minutes). */
const FOR_YOU_FEED_CACHE_SECONDS = (() => {
  const raw = process.env.FOR_YOU_FEED_CACHE_SECONDS;
  const n = raw ? Number.parseInt(raw, 10) : 600;
  if (!Number.isFinite(n)) return 600;
  return Math.min(Math.max(n, 60), 3600);
})();

const HOUR_MS = 60 * 60 * 1000;

function floorIsoToHour(value: string): string {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(Math.floor(t / HOUR_MS) * HOUR_MS).toISOString();
}

/**
 * Coarsen playback-driven fields: every serialized argument is part of the
 * `"use cache"` key, and position/timestamps change every few seconds while a
 * video plays. Ranking only needs `lastPositionSeconds > 0` and hour-level
 * recency (seed windows are days long).
 */
export function stableFeedSignals(
  signals: ForYouLibrarySignals,
): ForYouLibrarySignals {
  return {
    ...signals,
    snapshot: {
      ...signals.snapshot,
      watchProgress: signals.snapshot.watchProgress.map((entry) => ({
        ...entry,
        lastPositionSeconds: entry.lastPositionSeconds > 0 ? 1 : 0,
        lastWatchedAt: floorIsoToHour(entry.lastWatchedAt),
        updatedAt: floorIsoToHour(entry.updatedAt),
      })),
    },
  };
}

/** Bust cache when library activity changes. */
export function libraryFeedRevision(signals: ForYouLibrarySignals): string {
  const { snapshot, recentSearchQueries, mutedSearchQueries } = signals;

  const recentSearchFingerprint = recentSearchQueries
    .map((q) => q.trim().toLowerCase())
    .filter(Boolean)
    .join("|");

  const mutedSearchFingerprint = mutedSearchQueries
    .map((q) => q.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");

  return [
    forYouDayKey(),
    snapshot.savedChannels.length,
    snapshot.watchLater.length,
    snapshot.watchProgress.length,
    recentSearchQueries.length,
    recentSearchFingerprint,
    mutedSearchFingerprint,
  ].join(":");
}

async function buildForYouFeedCachedInner(
  userId: string,
  revision: string,
  signals: ForYouLibrarySignals,
): Promise<ForYouFeedResult> {
  "use cache";
  cacheTag("cleantube-for-you-feed", userId, revision);
  cacheLife({ revalidate: FOR_YOU_FEED_CACHE_SECONDS });
  void userId;
  void revision;
  return buildForYouFeed(signals);
}

export async function buildForYouFeedCached(
  userId: string,
  signals: ForYouLibrarySignals,
): Promise<ForYouFeedResult> {
  const revision = libraryFeedRevision(signals);
  return buildForYouFeedCachedInner(
    userId,
    revision,
    stableFeedSignals(signals),
  );
}
