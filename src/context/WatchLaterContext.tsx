"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { WatchLaterEntry } from "@/types/watchLater";

const STORAGE_KEY = "cleantube-watch-later";

function parseList(raw: string | null): WatchLaterEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is WatchLaterEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as WatchLaterEntry).entryId === "string" &&
        typeof (e as WatchLaterEntry).videoId === "string" &&
        typeof (e as WatchLaterEntry).title === "string" &&
        typeof (e as WatchLaterEntry).thumbnailUrl === "string" &&
        typeof (e as WatchLaterEntry).channelName === "string",
    );
  } catch {
    return [];
  }
}

function loadFromStorage(): WatchLaterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return parseList(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

type WatchLaterContextValue = {
  entries: WatchLaterEntry[];
  addOrUpdateEntry: (input: {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    channelName: string;
    startSeconds?: number;
  }) => void;
  removeByVideoId: (videoId: string) => void;
  isInWatchLater: (videoId: string) => boolean;
};

const WatchLaterContext = createContext<WatchLaterContextValue | null>(null);

export function WatchLaterProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<WatchLaterEntry[]>([]);
  const [ready, setReady] = useState(false);
  const skipNextPersist = useRef(true);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
    setEntries(loadFromStorage());
    skipNextPersist.current = true;
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* ignore */
    }
  }, [entries, ready]);

  useLayoutEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      skipNextPersist.current = true;
      setEntries(parseList(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addOrUpdateEntry = useCallback(
    (input: {
      videoId: string;
      title: string;
      thumbnailUrl: string;
      channelName: string;
      startSeconds?: number;
    }) => {
      const videoId = input.videoId.trim();
      if (!videoId) return;
      const next: WatchLaterEntry = {
        entryId:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        videoId,
        title: input.title.trim() || "Video",
        thumbnailUrl: input.thumbnailUrl,
        channelName: input.channelName.trim() || "Unknown channel",
        startSeconds:
          input.startSeconds != null && input.startSeconds > 0
            ? Math.floor(input.startSeconds)
            : undefined,
        addedAt: new Date().toISOString(),
      };

      setEntries((prev) => {
        const without = prev.filter((e) => e.videoId !== videoId);
        return [next, ...without];
      });
    },
    [],
  );

  const removeByVideoId = useCallback((videoId: string) => {
    setEntries((prev) => prev.filter((e) => e.videoId !== videoId));
  }, []);

  const isInWatchLater = useCallback(
    (videoId: string) => entries.some((e) => e.videoId === videoId),
    [entries],
  );

  const value = useMemo(
    () => ({
      entries,
      addOrUpdateEntry,
      removeByVideoId,
      isInWatchLater,
    }),
    [entries, addOrUpdateEntry, removeByVideoId, isInWatchLater],
  );

  return (
    <WatchLaterContext.Provider value={value}>
      {children}
    </WatchLaterContext.Provider>
  );
}

export function useWatchLater() {
  const ctx = useContext(WatchLaterContext);
  if (!ctx) {
    throw new Error("useWatchLater must be used within WatchLaterProvider");
  }
  return ctx;
}
