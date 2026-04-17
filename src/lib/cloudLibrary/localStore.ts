"use client";

import type { SavedChannel } from "@/types/savedChannel";
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
    return [
      {
        id: entry.id,
        name: entry.name,
        channelId:
          typeof entry.channelId === "string" ? entry.channelId : undefined,
        channelUrl:
          typeof entry.channelUrl === "string" ? entry.channelUrl : undefined,
        searchQuery: entry.searchQuery,
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
