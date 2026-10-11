"use client";

import type {
  SavedChannel,
  SavedChannelEntryKind,
} from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

export const WATCH_LATER_STORAGE_KEY = "cleantube-watch-later";
export const SAVED_CHANNELS_STORAGE_KEY = "cleantube-saved-channels";
export const WATCH_PROGRESS_STORAGE_KEY = "cleantube-watch-progress";

type Snapshot = {
  watchLater: WatchLaterEntry[];
  savedChannels: SavedChannel[];
  watchProgress: WatchProgressEntry[];
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSeconds(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

function parseWatchLater(raw: string | null): WatchLaterEntry[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!isObject(entry)) return [];
    if (
      typeof entry.entryId !== "string" ||
      typeof entry.videoId !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.thumbnailUrl !== "string" ||
      typeof entry.channelName !== "string" ||
      typeof entry.addedAt !== "string"
    ) {
      return [];
    }
    return [
      {
        entryId: entry.entryId,
        videoId: entry.videoId,
        title: entry.title,
        thumbnailUrl: entry.thumbnailUrl,
        channelName: entry.channelName,
        startSeconds: normalizeSeconds(entry.startSeconds),
        addedAt: entry.addedAt,
      },
    ];
  });
}

function parseSavedChannels(raw: string | null): SavedChannel[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!isObject(entry)) return [];
    if (
      typeof entry.id !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.searchQuery !== "string"
    ) {
      return [];
    }
    const parsedKind =
      entry.entryKind === "pinned_search" || entry.entryKind === "saved_channel"
        ? (entry.entryKind as SavedChannelEntryKind)
        : undefined;

    return [
      {
        id: entry.id,
        name: entry.name,
        channelId:
          typeof entry.channelId === "string" ? entry.channelId : undefined,
        channelUrl:
          typeof entry.channelUrl === "string" ? entry.channelUrl : undefined,
        thumbnailUrl:
          typeof entry.thumbnailUrl === "string"
            ? entry.thumbnailUrl
            : undefined,
        searchQuery: entry.searchQuery,
        entryKind: parsedKind,
      },
    ];
  });
}

function parseWatchProgress(raw: string | null): WatchProgressEntry[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!isObject(entry)) return [];
    if (
      typeof entry.videoId !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.thumbnailUrl !== "string" ||
      typeof entry.channelName !== "string" ||
      typeof entry.lastWatchedAt !== "string" ||
      typeof entry.updatedAt !== "string"
    ) {
      return [];
    }
    const lastPositionSeconds =
      typeof entry.lastPositionSeconds === "number" &&
      Number.isFinite(entry.lastPositionSeconds) &&
      entry.lastPositionSeconds >= 0
        ? Math.floor(entry.lastPositionSeconds)
        : 0;
    return [
      {
        videoId: entry.videoId,
        title: entry.title,
        thumbnailUrl: entry.thumbnailUrl,
        channelName: entry.channelName,
        lastPositionSeconds,
        durationSeconds: normalizeSeconds(entry.durationSeconds),
        completed: entry.completed === true,
        everCompleted:
          entry.everCompleted === true || entry.completed === true
            ? true
            : undefined,
        lastWatchedAt: entry.lastWatchedAt,
        updatedAt: entry.updatedAt,
      },
    ];
  });
}

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readLocalSnapshot(): Snapshot {
  return {
    watchLater: parseWatchLater(readLocalStorage(WATCH_LATER_STORAGE_KEY)),
    savedChannels: parseSavedChannels(
      readLocalStorage(SAVED_CHANNELS_STORAGE_KEY),
    ),
    watchProgress: parseWatchProgress(
      readLocalStorage(WATCH_PROGRESS_STORAGE_KEY),
    ),
  };
}

export function writeLocalWatchLater(entries: WatchLaterEntry[]) {
  writeLocalStorage(WATCH_LATER_STORAGE_KEY, JSON.stringify(entries));
}

export function writeLocalSavedChannels(channels: SavedChannel[]) {
  writeLocalStorage(SAVED_CHANNELS_STORAGE_KEY, JSON.stringify(channels));
}

export function writeLocalWatchProgress(entries: WatchProgressEntry[]) {
  writeLocalStorage(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(entries));
}

/** Writes all three library keys (e.g. mirror cloud after sign-in). */
export function writeLocalLibraryMirror(snapshot: Snapshot) {
  writeLocalWatchLater(snapshot.watchLater);
  writeLocalSavedChannels(snapshot.savedChannels);
  writeLocalWatchProgress(snapshot.watchProgress);
}

const USER_WATCH_PROGRESS_KEY_PREFIX = "cleantube-watch-progress:";
const USER_WATCH_PROGRESS_SYNCED_AT_KEY_PREFIX =
  "cleantube-watch-progress-synced-at:";

function userWatchProgressKey(userId: string): string {
  return `${USER_WATCH_PROGRESS_KEY_PREFIX}${userId}`;
}

/** Epoch ms of the last successful cloud sync for this user (0 if never). */
export function readLocalWatchProgressSyncedAt(userId: string): number {
  const raw = readLocalStorage(
    `${USER_WATCH_PROGRESS_SYNCED_AT_KEY_PREFIX}${userId}`,
  );
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function writeLocalWatchProgressSyncedAt(userId: string, at: number) {
  writeLocalStorage(
    `${USER_WATCH_PROGRESS_SYNCED_AT_KEY_PREFIX}${userId}`,
    String(at),
  );
}

/** Signed-in progress mirror, so resume does not wait on the cloud sync after iOS kills the app. */
export function readLocalWatchProgressForUser(
  userId: string,
): WatchProgressEntry[] {
  return parseWatchProgress(readLocalStorage(userWatchProgressKey(userId)));
}

export function writeLocalWatchProgressForUser(
  userId: string,
  entries: WatchProgressEntry[],
) {
  writeLocalStorage(userWatchProgressKey(userId), JSON.stringify(entries));
}

/** Merge one entry into the user mirror synchronously (safe to call from `pagehide`). */
export function upsertLocalWatchProgressForUser(
  userId: string,
  entry: WatchProgressEntry,
) {
  const rest = readLocalWatchProgressForUser(userId).filter(
    (existing) => existing.videoId !== entry.videoId,
  );
  writeLocalWatchProgressForUser(userId, [entry, ...rest]);
}

export function clearLocalWatchProgressMirrors() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key?.startsWith(USER_WATCH_PROGRESS_KEY_PREFIX) ||
        key?.startsWith(USER_WATCH_PROGRESS_SYNCED_AT_KEY_PREFIX)
      ) {
        keys.push(key);
      }
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Clears mirrored library data (e.g. after sign-out so the next anonymous session does not keep another account's library). */
export function clearLocalLibraryStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WATCH_LATER_STORAGE_KEY);
    window.localStorage.removeItem(SAVED_CHANNELS_STORAGE_KEY);
    window.localStorage.removeItem(WATCH_PROGRESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
