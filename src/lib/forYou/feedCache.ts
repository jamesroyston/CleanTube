import { unstable_cache } from "next/cache";

import { buildForYouFeed } from "./buildFeed";
import type { ForYouLibrarySignals } from "./loadLibrarySignals";
import type { ForYouFeedResult } from "./types";

/** Per-user feed cache TTL (default 10 minutes). */
const FOR_YOU_FEED_CACHE_SECONDS = (() => {
  const raw = process.env.FOR_YOU_FEED_CACHE_SECONDS;
  const n = raw ? Number.parseInt(raw, 10) : 600;
  if (!Number.isFinite(n)) return 600;
  return Math.min(Math.max(n, 60), 3600);
})();

/** Bust cache when library activity changes. */
export function libraryFeedRevision(signals: ForYouLibrarySignals): string {
  const { snapshot, recentSearchQueries } = signals;
  let latestProgress = 0;
  for (const entry of snapshot.watchProgress) {
    const t = Date.parse(entry.updatedAt);
    if (Number.isFinite(t) && t > latestProgress) latestProgress = t;
  }

  return [
    snapshot.savedChannels.length,
    snapshot.watchLater.length,
    snapshot.watchProgress.length,
    latestProgress,
    recentSearchQueries.length,
    recentSearchQueries[0] ?? "",
  ].join(":");
}

export async function buildForYouFeedCached(
  userId: string,
  signals: ForYouLibrarySignals,
): Promise<ForYouFeedResult> {
  const revision = libraryFeedRevision(signals);

  return unstable_cache(
    () => buildForYouFeed(signals),
    ["cleantube-for-you-feed", userId, revision],
    { revalidate: FOR_YOU_FEED_CACHE_SECONDS },
  )();
}
