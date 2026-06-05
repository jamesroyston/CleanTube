"use client";

import { createStore, del, entries, set } from "idb-keyval";
import type { Cache, State } from "swr";

const IDB_STORE = createStore("cleantube-swr", "swr-cache");
const IDB_KEY_PREFIX = "cleantube:swr:";

/** SWR key tuple prefixes eligible for IndexedDB persistence. */
const PERSIST_PREFIXES = [
  "for-you-feed",
  "channel-page",
  "search-results",
  "watch-video",
] as const;

const TTL_MS: Record<(typeof PERSIST_PREFIXES)[number], number> = {
  "for-you-feed": 24 * 60 * 60 * 1000,
  "channel-page": 24 * 60 * 60 * 1000,
  "search-results": 60 * 60 * 1000,
  "watch-video": 60 * 60 * 1000,
};

const MAX_ENTRIES = 120;

type PersistedEnvelope = {
  savedAt: number;
  data: State["data"];
};

function idbKey(serializedKey: string): string {
  return `${IDB_KEY_PREFIX}${serializedKey}`;
}

function shouldPersistKey(serializedKey: string): boolean {
  return PERSIST_PREFIXES.some((prefix) =>
    serializedKey.includes(`"${prefix}"`),
  );
}

function ttlForKey(serializedKey: string): number {
  const prefix = PERSIST_PREFIXES.find((p) => serializedKey.includes(`"${p}"`));
  return prefix ? TTL_MS[prefix] : 60 * 60 * 1000;
}

function isExpired(envelope: PersistedEnvelope, serializedKey: string): boolean {
  return Date.now() - envelope.savedAt > ttlForKey(serializedKey);
}

async function persistEntry(
  serializedKey: string,
  value: State,
): Promise<void> {
  if (!shouldPersistKey(serializedKey) || value.data === undefined) return;
  const envelope: PersistedEnvelope = {
    savedAt: Date.now(),
    data: value.data,
  };
  await set(idbKey(serializedKey), envelope, IDB_STORE);
}

async function removeEntry(serializedKey: string): Promise<void> {
  await del(idbKey(serializedKey), IDB_STORE);
}

let hydrationStarted = false;

function hydrateFromIdb(map: Cache): void {
  if (hydrationStarted || typeof window === "undefined") return;
  hydrationStarted = true;
  void (async () => {
    try {
      const all = await entries(IDB_STORE);
      const valid: { storageKey: string; serializedKey: string; envelope: PersistedEnvelope }[] =
        [];
      for (const [rawStorageKey, raw] of all) {
        const storageKey = String(rawStorageKey);
        if (!storageKey.startsWith(IDB_KEY_PREFIX)) continue;
        const envelope = raw as PersistedEnvelope;
        const serializedKey = storageKey.slice(IDB_KEY_PREFIX.length);
        if (!envelope?.savedAt || isExpired(envelope, serializedKey)) {
          await del(storageKey, IDB_STORE);
          continue;
        }
        valid.push({ storageKey, serializedKey, envelope });
      }
      valid.sort((a, b) => b.envelope.savedAt - a.envelope.savedAt);
      if (valid.length > MAX_ENTRIES) {
        await Promise.all(
          valid.slice(MAX_ENTRIES).map(({ storageKey }) => del(storageKey, IDB_STORE)),
        );
      }
      for (const { serializedKey, envelope } of valid.slice(0, MAX_ENTRIES)) {
        if (!map.get(serializedKey)) {
          map.set(serializedKey, {
            data: envelope.data,
            isValidating: false,
          });
        }
      }
    } catch {
      /* ignore IDB read errors */
    }
  })();
}

/**
 * SWR cache provider backed by IndexedDB for browse JSON across PWA relaunches.
 */
export function createIdbSwrProvider(): (cache: Readonly<Cache>) => Cache {
  return function provider() {
    const map = new Map<string, State>() as Cache;

    hydrateFromIdb(map);

    return new Proxy(map, {
      get(target, prop, receiver) {
        if (prop === "set") {
          return (key: string, value: State) => {
            target.set(key, value);
            void persistEntry(key, value);
            return receiver;
          };
        }
        if (prop === "delete") {
          return (key: string) => {
            const result = target.delete(key);
            void removeEntry(key);
            return result;
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
}

/** Purge all persisted SWR entries (sign-out / settings clear). */
export async function clearSwrIdbCache(): Promise<void> {
  try {
    const all = await entries(IDB_STORE);
    await Promise.all(
      all
        .filter(([key]) => String(key).startsWith(IDB_KEY_PREFIX))
        .map(([key]) => del(String(key), IDB_STORE)),
    );
  } catch {
    /* ignore */
  }
}
