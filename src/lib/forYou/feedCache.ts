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
  refreshEpoch: number,
  signals: ForYouLibrarySignals,
): Promise<ForYouFeedResult> {
  "use cache";
  cacheTag("cleantube-for-you-feed", userId, revision);
  cacheLife({ revalidate: FOR_YOU_FEED_CACHE_SECONDS });
  void userId;
  void revision;
  void refreshEpoch;
  return buildForYouFeed(signals);
}

/**
 * `refreshEpoch` is part of the cache key: a user-forced refresh bumps it to
 * get a fresh build that later normal loads (sending the same epoch) reuse.
 * Tag invalidation can't do this from a route handler: the expiry is flushed
 * after the response and stamped later than the entry rebuilt in the same
 * request, so the fresh entry would be expired immediately.
 */
export async function buildForYouFeedCached(
  userId: string,
  signals: ForYouLibrarySignals,
  refreshEpoch = 0,
): Promise<ForYouFeedResult> {
  const revision = libraryFeedRevision(signals);
  return buildForYouFeedCachedInner(
    userId,
    revision,
    refreshEpoch,
    stableFeedSignals(signals),
  );
}

/** Ignore a forced rebuild if the same user forced one this recently. */
export const FOR_YOU_FORCE_REFRESH_MIN_INTERVAL_MS = 10_000;

const lastForcedRefreshAt = new Map<string, number>();

/**
 * Light per-process throttle so repeated pulls can't hammer YouTube. The
 * cookie epoch (`previousEpoch`) also counts, which covers requests that land
 * on a different server instance.
 */
export function claimForcedFeedRefresh(
  userId: string,
  previousEpoch: number,
  now = Date.now(),
): boolean {
  const last = Math.max(lastForcedRefreshAt.get(userId) ?? 0, previousEpoch);
  if (now - last < FOR_YOU_FORCE_REFRESH_MIN_INTERVAL_MS) return false;
  if (lastForcedRefreshAt.size > 1000) {
    for (const [id, at] of lastForcedRefreshAt) {
      if (now - at >= FOR_YOU_FORCE_REFRESH_MIN_INTERVAL_MS) {
        lastForcedRefreshAt.delete(id);
      }
    }
  }
  lastForcedRefreshAt.set(userId, now);
  return true;
}
