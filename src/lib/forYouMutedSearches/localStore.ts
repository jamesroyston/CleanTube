import type { ForYouMutedSearchEntry } from "./types";
import {
  FOR_YOU_MUTED_SEARCHES_MAX_ITEMS,
  normalizeForYouSearchQuery,
} from "./types";

const STORAGE_KEY_PREFIX = "cleantube-for-you-muted-searches:";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readRaw(userId: string): ForYouMutedSearchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ForYouMutedSearchEntry =>
        typeof entry === "object" &&
        entry != null &&
        typeof (entry as ForYouMutedSearchEntry).queryKey === "string" &&
        typeof (entry as ForYouMutedSearchEntry).mutedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeRaw(userId: string, entries: ForYouMutedSearchEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

function mergeMutedEntries(
  local: ForYouMutedSearchEntry[],
  remote: ForYouMutedSearchEntry[],
): ForYouMutedSearchEntry[] {
  const byKey = new Map<string, ForYouMutedSearchEntry>();

  for (const entry of remote) {
    byKey.set(entry.queryKey, entry);
  }
  for (const entry of local) {
    const existing = byKey.get(entry.queryKey);
    if (!existing) {
      byKey.set(entry.queryKey, entry);
      continue;
    }
    const localTime = Date.parse(entry.mutedAt);
    const remoteTime = Date.parse(existing.mutedAt);
    if (
      Number.isFinite(localTime) &&
      (!Number.isFinite(remoteTime) || localTime > remoteTime)
    ) {
      byKey.set(entry.queryKey, entry);
    }
  }

  return Array.from(byKey.values())
    .sort(
      (a, b) => (Date.parse(b.mutedAt) || 0) - (Date.parse(a.mutedAt) || 0),
    )
    .slice(0, FOR_YOU_MUTED_SEARCHES_MAX_ITEMS);
}

export function readMutedSearchQueryKeys(userId: string): Set<string> {
  return new Set(readRaw(userId).map((entry) => entry.queryKey));
}

export function mergeMutedSearchesFromCloud(
  userId: string,
  remote: ForYouMutedSearchEntry[],
): ForYouMutedSearchEntry[] {
  const merged = mergeMutedEntries(readRaw(userId), remote);
  writeRaw(userId, merged);
  return merged;
}

export function muteForYouSearchLocal(
  userId: string,
  query: string,
): ForYouMutedSearchEntry[] {
  const queryKey = normalizeForYouSearchQuery(query);
  if (!queryKey) return readRaw(userId);

  const now = new Date().toISOString();
  const next = [
    { queryKey, mutedAt: now },
    ...readRaw(userId).filter((entry) => entry.queryKey !== queryKey),
  ].slice(0, FOR_YOU_MUTED_SEARCHES_MAX_ITEMS);

  writeRaw(userId, next);
  return next;
}

export function unmuteForYouSearchLocal(
  userId: string,
  query: string,
): ForYouMutedSearchEntry[] {
  const queryKey = normalizeForYouSearchQuery(query);
  if (!queryKey) return readRaw(userId);
  const next = readRaw(userId).filter((entry) => entry.queryKey !== queryKey);
  writeRaw(userId, next);
  return next;
}

export function clearMutedForYouSearches(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}
