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

import type { SavedChannel } from "@/types/savedChannel";

const STORAGE_KEY = "cleantube-saved-channels";

function parseChannelList(raw: string | null): SavedChannel[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is SavedChannel =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as SavedChannel).id === "string" &&
        typeof (c as SavedChannel).name === "string" &&
        typeof (c as SavedChannel).searchQuery === "string",
    );
  } catch {
    return [];
  }
}

function loadFromStorage(): SavedChannel[] {
  if (typeof window === "undefined") return [];
  try {
    return parseChannelList(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function sameChannel(a: SavedChannel, b: Partial<SavedChannel>): boolean {
  if (a.channelId && b.channelId && a.channelId === b.channelId) return true;
  if (a.channelUrl && b.channelUrl && a.channelUrl === b.channelUrl) return true;
  if (
    b.searchQuery &&
    a.searchQuery.trim().toLowerCase() === b.searchQuery.trim().toLowerCase()
  )
    return true;
  return false;
}

type SavedChannelsContextValue = {
  channels: SavedChannel[];
  addChannel: (input: {
    name: string;
    channelId?: string;
    channelUrl?: string;
    searchQuery?: string;
  }) => void;
  removeChannel: (id: string) => void;
};

const SavedChannelsContext = createContext<SavedChannelsContextValue | null>(
  null,
);

export function SavedChannelsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [channels, setChannels] = useState<SavedChannel[]>([]);
  const [ready, setReady] = useState(false);
  const skipNextPersist = useRef(true);

  useLayoutEffect(() => {
    // Client-only: cannot read localStorage during SSR; sync once after paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
    setChannels(loadFromStorage());
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
    } catch {
      /* ignore */
    }
  }, [channels, ready]);

  useLayoutEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      skipNextPersist.current = true;
      setChannels(parseChannelList(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addChannel = useCallback(
    (input: {
      name: string;
      channelId?: string;
      channelUrl?: string;
      searchQuery?: string;
    }) => {
      const name = input.name.trim();
      if (!name) return;
      const searchQuery = (input.searchQuery ?? name).trim();
      const next: SavedChannel = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        channelId: input.channelId,
        channelUrl: input.channelUrl,
        searchQuery,
      };

      setChannels((prev) => {
        if (
          prev.some((c) =>
            sameChannel(c, {
              channelId: next.channelId,
              channelUrl: next.channelUrl,
              searchQuery: next.searchQuery,
            }),
          )
        ) {
          return prev;
        }
        return [next, ...prev];
      });
    },
    [],
  );

  const removeChannel = useCallback((id: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ channels, addChannel, removeChannel }),
    [channels, addChannel, removeChannel],
  );

  return (
    <SavedChannelsContext.Provider value={value}>
      {children}
    </SavedChannelsContext.Provider>
  );
}

export function useSavedChannels() {
  const ctx = useContext(SavedChannelsContext);
  if (!ctx) {
    throw new Error(
      "useSavedChannels must be used within SavedChannelsProvider",
    );
  }
  return ctx;
}
