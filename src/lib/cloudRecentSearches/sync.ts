import {
  RECENT_SEARCHES_MAX_ITEMS,
  type RecentSearchEntry,
} from "@/lib/cloudRecentSearches/types";

function normalizeQuery(query: string): string {
  return query.trim();
}

function queryKey(query: string): string {
  return normalizeQuery(query).toLowerCase();
}

/** Assign synthetic timestamps from list order (index 0 = newest). */
export function localQueriesToEntries(queries: string[]): RecentSearchEntry[] {
  const now = Date.now();
  return queries
    .map((raw, index) => ({
      query: normalizeQuery(raw),
      searchedAt: new Date(now - index * 1000).toISOString(),
    }))
    .filter((entry) => entry.query.length > 0);
}

export function entriesToQueryList(entries: RecentSearchEntry[]): string[] {
  return entries.map((entry) => entry.query);
}

/** Merge local and remote recent searches; case-insensitive dedupe, max 15, newest first. */
export function mergeRecentSearches(
  localQueries: string[],
  remoteEntries: RecentSearchEntry[],
): RecentSearchEntry[] {
  const localEntries = localQueriesToEntries(localQueries);
  const byKey = new Map<string, RecentSearchEntry>();

  for (const entry of [...localEntries, ...remoteEntries]) {
    const key = queryKey(entry.query);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || entry.searchedAt > existing.searchedAt) {
      byKey.set(key, {
        query: entry.query,
        searchedAt: entry.searchedAt,
      });
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) =>
      a.searchedAt < b.searchedAt ? 1 : a.searchedAt > b.searchedAt ? -1 : 0,
    )
    .slice(0, RECENT_SEARCHES_MAX_ITEMS);
}
