import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";

export function entriesToQueryList(entries: RecentSearchEntry[]): string[] {
  return entries.map((entry) => entry.query);
}
