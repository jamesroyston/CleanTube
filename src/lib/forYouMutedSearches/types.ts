export type ForYouMutedSearchEntry = {
  queryKey: string;
  mutedAt: string;
};

export const FOR_YOU_MUTED_SEARCHES_MAX_ITEMS = 100;

export function normalizeForYouSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}
