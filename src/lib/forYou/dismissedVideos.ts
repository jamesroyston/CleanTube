import type { ForYouDismissedEntry } from "@/lib/forYouDismissed/types";
import { FOR_YOU_DISMISSED_MAX_ITEMS } from "@/lib/forYouDismissed/types";

const STORAGE_KEY_PREFIX = "cleantube-for-you-dismissed:";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readRaw(userId: string): ForYouDismissedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ForYouDismissedEntry =>
        typeof entry === "object" &&
        entry != null &&
        typeof (entry as ForYouDismissedEntry).videoId === "string" &&
        typeof (entry as ForYouDismissedEntry).dismissedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeRaw(userId: string, entries: ForYouDismissedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

function mergeDismissedEntries(
  local: ForYouDismissedEntry[],
  remote: ForYouDismissedEntry[],
): ForYouDismissedEntry[] {
  const byVideoId = new Map<string, ForYouDismissedEntry>();

  for (const entry of remote) {
    byVideoId.set(entry.videoId, entry);
  }
  for (const entry of local) {
    const existing = byVideoId.get(entry.videoId);
    if (!existing) {
      byVideoId.set(entry.videoId, entry);
      continue;
    }
    const localTime = Date.parse(entry.dismissedAt);
    const remoteTime = Date.parse(existing.dismissedAt);
    if (
      Number.isFinite(localTime) &&
      (!Number.isFinite(remoteTime) || localTime > remoteTime)
    ) {
      byVideoId.set(entry.videoId, entry);
    }
  }

  return Array.from(byVideoId.values())
    .sort(
      (a, b) =>
        (Date.parse(b.dismissedAt) || 0) - (Date.parse(a.dismissedAt) || 0),
    )
    .slice(0, FOR_YOU_DISMISSED_MAX_ITEMS);
}

export function readDismissedVideoIds(userId: string): Set<string> {
  return new Set(readRaw(userId).map((entry) => entry.videoId));
}

export function writeDismissedEntries(
  userId: string,
  entries: ForYouDismissedEntry[],
): void {
  writeRaw(
    userId,
    entries.slice(0, FOR_YOU_DISMISSED_MAX_ITEMS),
  );
}

export function mergeDismissedFromCloud(
  userId: string,
  remote: ForYouDismissedEntry[],
): ForYouDismissedEntry[] {
  const merged = mergeDismissedEntries(readRaw(userId), remote);
  writeRaw(userId, merged);
  return merged;
}

export function dismissForYouVideoLocal(
  userId: string,
  videoId: string,
): ForYouDismissedEntry[] {
  const id = videoId.trim();
  if (!id) return readRaw(userId);

  const now = new Date().toISOString();
  const next = [
    { videoId: id, dismissedAt: now },
    ...readRaw(userId).filter((entry) => entry.videoId !== id),
  ].slice(0, FOR_YOU_DISMISSED_MAX_ITEMS);

  writeRaw(userId, next);
  return next;
}

export function clearDismissedForYouVideos(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}
