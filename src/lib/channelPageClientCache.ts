import { createStore, del, entries, set } from "idb-keyval";

import type { ChannelSortMode, ChannelVideosPage } from "@/lib/youtubeTypes";

const STORAGE_PREFIX = "cleantube:channel-page:v2:";
const IDB_STORE = createStore("cleantube-channel-page", "v2");
const CHANNEL_PAGE_TTL_MS = 24 * 60 * 60 * 1000;

const memoryMirror = new Map<string, ChannelVideosPage>();
let hydrationStarted = false;

export type CachedChannelPagePayload = {
  v: 2;
  savedAt: number;
  page: ChannelVideosPage;
};

function readLegacySessionStorage(key: string): ChannelVideosPage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChannelPagePayload;
    if (parsed?.v !== 2 || !parsed.page?.channel?.id) return null;
    if (Date.now() - parsed.savedAt > CHANNEL_PAGE_TTL_MS) return null;
    return parsed.page;
  } catch {
    return null;
  }
}

/** Hydrate in-memory mirror from IndexedDB (call once on app boot). */
export function hydrateChannelPageCachesFromIdb(): void {
  if (hydrationStarted || typeof window === "undefined") return;
  hydrationStarted = true;
  void (async () => {
    try {
      const all = await entries(IDB_STORE);
      for (const [rawKey, payload] of all) {
        const key = String(rawKey);
        const cached = payload as CachedChannelPagePayload;
        if (
          cached?.v !== 2 ||
          !cached.page?.channel?.id ||
          Date.now() - cached.savedAt > CHANNEL_PAGE_TTL_MS
        ) {
          await del(key, IDB_STORE);
          continue;
        }
        memoryMirror.set(key, cached.page);
      }
    } catch {
      /* ignore */
    }
  })();
}

/**
 * IDB-backed fallback when the server returns no channel grid (see ChannelRecoverable).
 * Keys are per channel/sort/page; clearing removes all backups for this origin.
 */
export async function clearChannelPageSessionBackups(): Promise<number> {
  memoryMirror.clear();
  if (typeof window === "undefined") return 0;

  const prefix = "cleantube:channel-page:";
  const sessionKeys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(prefix)) sessionKeys.push(k);
  }
  for (const k of sessionKeys) {
    sessionStorage.removeItem(k);
  }

  try {
    const all = await entries(IDB_STORE);
    await Promise.all(all.map(([key]) => del(key, IDB_STORE)));
    return all.length + sessionKeys.length;
  } catch {
    return sessionKeys.length;
  }
}

export function buildChannelPageCacheKey(input: {
  channelId: string;
  sort: ChannelSortMode;
  pageToken?: string;
}): string {
  const page = input.pageToken?.trim() || "1";
  return `${STORAGE_PREFIX}${input.channelId}:${input.sort}:${page}`;
}

export function readChannelPageCache(
  key: string,
): ChannelVideosPage | null {
  if (typeof window === "undefined") return null;
  const mirrored = memoryMirror.get(key);
  if (mirrored) return mirrored;
  const legacy = readLegacySessionStorage(key);
  if (legacy) {
    memoryMirror.set(key, legacy);
    void writeChannelPageCache(key, legacy);
  }
  return legacy;
}

export function writeChannelPageCache(
  key: string,
  page: ChannelVideosPage,
): void {
  if (typeof window === "undefined") return;
  memoryMirror.set(key, page);
  const payload: CachedChannelPagePayload = {
    v: 2,
    savedAt: Date.now(),
    page,
  };
  void set(key, payload, IDB_STORE).catch(() => {
    /* quota / private mode */
  });
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
