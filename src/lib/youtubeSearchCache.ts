import { cacheLife, cacheTag } from "next/cache";

import type { SearchSortMode } from "@/lib/uploadedAtSort";
import type { MixedSearchResults } from "@/lib/youtubeTypes";
import { searchMixedResults } from "@/lib/youtube";

/** Hint for CDN/edge layering if later served via Route Handler (parity with channel resolve hints). */
export const SEARCH_MIXED_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=1800";

const SEARCH_MIXED_CACHE_SECONDS = (() => {
  const raw = process.env.SEARCH_MIXED_CACHE_SECONDS;
  const n = raw ? Number.parseInt(raw, 10) : 300;
  if (!Number.isFinite(n)) return 300;
  return Math.min(Math.max(n, 30), 86400);
})();

/** Trim + bounded length for sane cache keys and upstream calls. */
export function normalizeSearchQueryMixed(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 4096);
}

async function searchMixedResultsCachedInner(
  query: string,
  limit: number,
  sortMode: SearchSortMode,
): Promise<MixedSearchResults> {
  "use cache";
  cacheTag("cleantube-search-mixed", query, String(limit), sortMode);
  cacheLife({ revalidate: SEARCH_MIXED_CACHE_SECONDS });
  return searchMixedResults(query, limit, sortMode);
}

/**
 * Dedupes repeated identical searches across requests via the Next Data Cache (stale-after `revalidate` semantics).
 *
 * Caveat: transient InnerTube failures can return empty lists; a short TTL limits how long a bogus empty stays warm.
 */
export async function searchMixedResultsCached(
  query: string,
  limit = 24,
  sortMode: SearchSortMode = "relevance",
): Promise<MixedSearchResults> {
  const q = normalizeSearchQueryMixed(query);
  if (!q) return { channels: [], videos: [] };
  const lim = Math.min(Math.max(limit, 1), 50);

  return searchMixedResultsCachedInner(q, lim, sortMode);
}
