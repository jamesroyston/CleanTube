"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteAllRecentSearches,
  deleteRecentSearchByQuery,
  fetchCloudRecentSearches,
  trimRecentSearchesToCap,
  upsertRecentSearch,
} from "@/lib/cloudRecentSearches/cloudStore";
import { clearForYouFeedCache } from "@/hooks/useForYouFeed";
import { entriesToQueryList } from "@/lib/cloudRecentSearches/sync";
import { RECENT_SEARCHES_MAX_ITEMS } from "@/lib/cloudRecentSearches/types";
import {
  deleteAllSavedChannels,
  deleteAllWatchLater,
  deleteAllWatchProgress,
  deleteSavedChannelById,
  deleteWatchLaterByVideoId,
  deleteWatchProgressByVideoId,
  fetchCloudSnapshot,
  getInitialSession,
  resetPasswordForEmail,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuthChanges,
  upsertSavedChannels,
  upsertWatchLaterEntries,
  upsertWatchProgressEntries,
} from "@/lib/cloudLibrary/cloudStore";
import {
  type ListedFactor,
  completePhoneMfa,
  completeTotpMfa,
  getPendingSupabaseMfa,
  sendPhoneMfaChallenge,
} from "@/lib/cloudLibrary/mfaClient";
import {
  browserSupportsPasskeys,
  deletePasskeyFromDb,
  listPasskeysFromDb,
  type PasskeyRegistrationStep,
  registerPasskeyWithApi,
  signInWithPasskeyApi,
  type PasskeyRow,
} from "@/lib/cloudLibrary/webauthnClient";
import {
  deriveResumeSeconds,
  isFreshInProgress,
  isInProgress,
  mergeSavedChannels,
  sortWatchProgressByRecency,
} from "@/lib/cloudLibrary/sync";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  type SavedChannel,
  type SavedChannelEntryKind,
  effectiveSavedChannelKind,
} from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

type AuthStatus = "loading" | "ready";

/** Cloud library sync phase for signed-in users. */
export type LibraryCloudSyncState =
  | "unavailable"
  | "signed_out"
  | "syncing"
  | "synced"
  | "error";

type WatchProgressInput = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  lastPositionSeconds: number;
  durationSeconds?: number;
  completed?: boolean;
};

type WatchProgressUpsertOptions = {
  syncCloud?: boolean;
};

type CloudLibraryContextValue = {
  authStatus: AuthStatus;
  /** True after auth bootstrap completes (library state is initialized). */
  localLibraryHydrated: boolean;
  isCloudConfigured: boolean;
  /** True when the signed-in user can persist library data to the cloud. */
  canPersistLibrary: boolean;
  libraryCloudSyncState: LibraryCloudSyncState;
  session: Session | null;
  user: User | null;
  watchLaterEntries: WatchLaterEntry[];
  savedChannels: SavedChannel[];
  watchProgress: WatchProgressEntry[];
  inProgressEntries: WatchProgressEntry[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOutUser: () => Promise<void>;
  addSavedChannel: (input: {
    name: string;
    channelId?: string;
    channelUrl?: string;
    thumbnailUrl?: string;
    searchQuery?: string;
    entryKind?: SavedChannelEntryKind;
  }) => Promise<void>;
  updateSavedChannel: (
    id: string,
    patch: Partial<Omit<SavedChannel, "id">>,
  ) => Promise<void>;
  removeSavedChannel: (id: string) => Promise<void>;
  addOrUpdateWatchLater: (input: {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    channelName: string;
    startSeconds?: number;
  }) => Promise<void>;
  removeWatchLaterByVideoId: (videoId: string) => Promise<void>;
  clearWatchLater: () => Promise<void>;
  isInWatchLater: (videoId: string) => boolean;
  upsertWatchProgress: (
    input: WatchProgressInput,
    options?: WatchProgressUpsertOptions,
  ) => Promise<void>;
  removeWatchProgressByVideoId: (videoId: string) => Promise<void>;
  clearWatchProgress: () => Promise<void>;
  getProgressByVideoId: (videoId: string) => WatchProgressEntry | undefined;
  getResumeSeconds: (
    videoId: string,
    watchLaterStartSeconds?: number,
  ) => number | undefined;
  getRecentSearches: () => string[];
  addRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  removeRecentSearch: (query: string) => Promise<void>;
  passkeysSupported: boolean;
  registerPasskey: (
    friendlyName: string,
    onStep?: (step: PasskeyRegistrationStep) => void,
  ) => Promise<{ error: string | null }>;
  signInWithPasskey: (email: string) => Promise<{ error: string | null }>;
  deletePasskey: (id: string) => Promise<{ error: string | null }>;
  listPasskeys: () => Promise<{
    factors: PasskeyRow[];
    error: string | null;
  }>;
  getPendingSupabaseMfa: () => Promise<{
    needsMfa: boolean;
    factors: ListedFactor[];
    error: string | null;
  }>;
  completeTotpMfa: (factorId: string, code: string) => Promise<{ error: string | null }>;
  sendPhoneMfaChallenge: (factorId: string) => Promise<{
    challengeId: string | null;
    error: string | null;
  }>;
  completePhoneMfa: (
    factorId: string,
    challengeId: string,
    code: string,
  ) => Promise<{ error: string | null }>;
};

const CloudLibraryContext = createContext<CloudLibraryContextValue | null>(null);

function randomId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeComparableUrl(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return t.replace(/\/$/, "").toLowerCase();
  }
}

function isDuplicateSavedLibraryEntry(a: SavedChannel, b: SavedChannel): boolean {
  if (effectiveSavedChannelKind(a) !== effectiveSavedChannelKind(b)) return false;

  const kind = effectiveSavedChannelKind(b);
  if (kind === "pinned_search") {
    return (
      a.searchQuery.trim().toLowerCase() === b.searchQuery.trim().toLowerCase()
    );
  }

  const aId = a.channelId?.trim();
  const bId = b.channelId?.trim();
  if (aId && bId && aId === bId) return true;

  const aUrl = normalizeComparableUrl(a.channelUrl);
  const bUrlNorm = normalizeComparableUrl(b.channelUrl);
  if (aUrl && bUrlNorm && aUrl === bUrlNorm) return true;

  const orphanA = !aId && !aUrl;
  const orphanB = !bId && !bUrlNorm;
  if (orphanA && orphanB) {
    return (
      a.searchQuery.trim().toLowerCase() === b.searchQuery.trim().toLowerCase()
    );
  }
  return false;
}

function normalizeProgressInput(input: WatchProgressInput): WatchProgressEntry {
  const now = new Date().toISOString();
  return {
    videoId: input.videoId,
    title: input.title.trim() || "Video",
    thumbnailUrl: input.thumbnailUrl,
    channelName: input.channelName.trim() || "Unknown channel",
    lastPositionSeconds: Math.max(0, Math.floor(input.lastPositionSeconds)),
    durationSeconds:
      input.durationSeconds != null && input.durationSeconds > 0
        ? Math.floor(input.durationSeconds)
        : undefined,
    completed: input.completed === true,
    everCompleted: input.completed === true ? true : undefined,
    lastWatchedAt: now,
    updatedAt: now,
  };
}

type WatchProgressLivePatch = {
  lastPositionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
};

function mergeWatchProgressLivePatch(
  base: WatchProgressEntry,
  patch: WatchProgressLivePatch | undefined,
): WatchProgressEntry {
  if (!patch) return base;
  return {
    ...base,
    lastPositionSeconds: Math.max(base.lastPositionSeconds, patch.lastPositionSeconds),
    durationSeconds:
      patch.durationSeconds !== undefined
        ? patch.durationSeconds
        : base.durationSeconds,
    completed:
      patch.completed === true
        ? true
        : base.completed && patch.completed === false
          ? false
          : base.completed,
    everCompleted:
      patch.completed === true || base.everCompleted === true || base.completed
        ? true
        : base.everCompleted,
  };
}

function normalizeRecentSearchQuery(query: string): string {
  return query.trim();
}

function dedupeRecentSearchQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of queries) {
    const query = normalizeRecentSearchQuery(raw);
    if (!query) continue;
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(query);
    if (next.length >= RECENT_SEARCHES_MAX_ITEMS) break;
  }
  return next;
}

function prependRecentSearchQuery(queries: string[], query: string): string[] {
  const normalized = normalizeRecentSearchQuery(query);
  if (!normalized) return queries;
  const key = normalized.toLowerCase();
  const rest = queries.filter((entry) => entry.toLowerCase() !== key);
  return dedupeRecentSearchQueries([normalized, ...rest]);
}

function removeRecentSearchQuery(queries: string[], query: string): string[] {
  const key = normalizeRecentSearchQuery(query).toLowerCase();
  if (!key) return queries;
  return queries.filter((entry) => entry.toLowerCase() !== key);
}

export function CloudLibraryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const isCloudConfigured = supabase != null;
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    supabase == null ? "ready" : "loading",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [watchLaterEntries, setWatchLaterEntries] = useState<WatchLaterEntry[]>([]);
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([]);
  const [watchProgress, setWatchProgress] = useState<WatchProgressEntry[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [localLibraryHydrated, setLocalLibraryHydrated] = useState(() =>
    supabase == null,
  );
  const watchProgressLiveRef = useRef<Map<string, WatchProgressLivePatch>>(new Map());
  const [passkeysSupported, setPasskeysSupported] = useState(false);
  const [libraryCloudSyncState, setLibraryCloudSyncState] =
    useState<LibraryCloudSyncState>(() =>
      supabase == null ? "unavailable" : "signed_out",
    );
  const syncStartedAtRef = useRef<number | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const savedChannelsRef = useRef(savedChannels);
  const watchProgressRef = useRef(watchProgress);
  const watchLaterEntriesRef = useRef(watchLaterEntries);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    savedChannelsRef.current = savedChannels;
    watchProgressRef.current = watchProgress;
    watchLaterEntriesRef.current = watchLaterEntries;
  }, [savedChannels, watchProgress, watchLaterEntries]);

  const clearLibraryState = useCallback(() => {
    watchProgressLiveRef.current.clear();
    setWatchLaterEntries([]);
    setSavedChannels([]);
    setWatchProgress([]);
    setRecentSearches([]);
    lastSyncedUserIdRef.current = null;
  }, []);

  const syncFromCloud = useCallback(
    async (nextUser: User) => {
      if (!supabase) return;
      if (syncInFlightRef.current) {
        return syncInFlightRef.current;
      }

      const run = async () => {
        const hasLibraryInMemory =
          lastSyncedUserIdRef.current === nextUser.id ||
          savedChannelsRef.current.length > 0 ||
          watchProgressRef.current.length > 0 ||
          watchLaterEntriesRef.current.length > 0;
        const isInitialSync = !hasLibraryInMemory;

        if (isInitialSync) {
          syncStartedAtRef.current = Date.now();
          setLibraryCloudSyncState("syncing");
        }

        let { data: authData } = await supabase.auth.getSession();
        let token = authData.session?.access_token;
        let tokenUserId = authData.session?.user?.id;
        if (!token || tokenUserId !== nextUser.id) {
          await supabase.auth.refreshSession();
          authData = (await supabase.auth.getSession()).data;
          token = authData.session?.access_token;
          tokenUserId = authData.session?.user?.id;
        }
        if (!token || tokenUserId !== nextUser.id) {
          await new Promise<void>((resolve) => queueMicrotask(resolve));
          authData = (await supabase.auth.getSession()).data;
          token = authData.session?.access_token;
          tokenUserId = authData.session?.user?.id;
        }
        if (!token || tokenUserId !== nextUser.id) {
          if (isInitialSync) {
            setLibraryCloudSyncState("error");
          }
          syncStartedAtRef.current = null;
          return;
        }

        try {
          const [remote, remoteRecent] = await Promise.all([
            fetchCloudSnapshot(supabase),
            fetchCloudRecentSearches(supabase),
          ]);

          watchProgressLiveRef.current.clear();
          setWatchLaterEntries(remote.watchLater);
          setSavedChannels(remote.savedChannels);
          setWatchProgress(remote.watchProgress);
          setRecentSearches(entriesToQueryList(remoteRecent));
          lastSyncedUserIdRef.current = nextUser.id;
          setLibraryCloudSyncState("synced");
          syncStartedAtRef.current = null;
        } catch {
          syncStartedAtRef.current = null;
          if (isInitialSync) {
            setLibraryCloudSyncState("error");
            throw new Error("Library sync failed");
          }
        }
      };

      const promise = run().finally(() => {
        if (syncInFlightRef.current === promise) {
          syncInFlightRef.current = null;
        }
      });
      syncInFlightRef.current = promise;
      return promise;
    },
    [supabase],
  );

  useLayoutEffect(() => {
    setPasskeysSupported(browserSupportsPasskeys());
  }, []);

  const clearAuthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyAuthenticatedState = useCallback(
    (nextSession: Session) => {
      if (clearAuthDebounceRef.current) {
        clearTimeout(clearAuthDebounceRef.current);
        clearAuthDebounceRef.current = null;
      }
      setSession(nextSession);
      setUser(nextSession.user);
      void syncFromCloud(nextSession.user).catch(() => {
        setLibraryCloudSyncState("error");
      });
      setAuthStatus("ready");
      setLocalLibraryHydrated(true);
    },
    [syncFromCloud],
  );

  const applySignedOutState = useCallback(() => {
    if (clearAuthDebounceRef.current) {
      clearTimeout(clearAuthDebounceRef.current);
      clearAuthDebounceRef.current = null;
    }
    setSession(null);
    setUser(null);
    clearLibraryState();
    setLibraryCloudSyncState(supabase ? "signed_out" : "unavailable");
    clearForYouFeedCache();
    setAuthStatus("ready");
    setLocalLibraryHydrated(true);
  }, [clearLibraryState, supabase]);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    void (async () => {
      const initial = await getInitialSession(supabase);
      if (cancelled) return;
      setSession(initial.session);
      setUser(initial.user);
      if (initial.user) {
        try {
          await syncFromCloud(initial.user);
        } catch {
          setLibraryCloudSyncState("error");
        }
      } else {
        clearLibraryState();
        setLibraryCloudSyncState("signed_out");
      }
      if (!cancelled) {
        setAuthStatus("ready");
        setLocalLibraryHydrated(true);
      }
    })();

    const { data } = subscribeToAuthChanges(supabase, (event, nextSession) => {
      if (event === "SIGNED_OUT") {
        applySignedOutState();
        return;
      }

      if (nextSession?.user) {
        if (
          event === "TOKEN_REFRESHED" &&
          lastSyncedUserIdRef.current === nextSession.user.id
        ) {
          setSession(nextSession);
          setUser(nextSession.user);
          setAuthStatus("ready");
          setLocalLibraryHydrated(true);
          return;
        }
        applyAuthenticatedState(nextSession);
        return;
      }

      if (!nextSession) {
        if (clearAuthDebounceRef.current) {
          clearTimeout(clearAuthDebounceRef.current);
        }
        clearAuthDebounceRef.current = setTimeout(() => {
          clearAuthDebounceRef.current = null;
          applySignedOutState();
        }, 300);
      }
    });

    return () => {
      cancelled = true;
      if (clearAuthDebounceRef.current) {
        clearTimeout(clearAuthDebounceRef.current);
        clearAuthDebounceRef.current = null;
      }
      data.subscription.unsubscribe();
    };
  }, [
    applyAuthenticatedState,
    applySignedOutState,
    clearLibraryState,
    supabase,
    syncFromCloud,
  ]);

  useEffect(() => {
    if (!supabase) return;

    const recoverSessionOnVisible = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error || !user) return;
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user) return;
          if (clearAuthDebounceRef.current) {
            clearTimeout(clearAuthDebounceRef.current);
            clearAuthDebounceRef.current = null;
          }
          setSession(session);
          setUser(user);
        });
      });

      const activeUser = userRef.current;
      if (!activeUser) return;
      const syncStartedAt = syncStartedAtRef.current;
      if (syncStartedAt == null) return;
      if (Date.now() - syncStartedAt < 8_000) return;
      void syncFromCloud(activeUser);
    };

    document.addEventListener("visibilitychange", recoverSessionOnVisible);
    return () =>
      document.removeEventListener("visibilitychange", recoverSessionOnVisible);
  }, [supabase, syncFromCloud]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await signInWithPassword(supabase, email, password);
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}${window.location.search}`
          : undefined;
      const { error } = await signUpWithPassword(
        supabase,
        email,
        password,
        emailRedirectTo,
      );
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      const { error } = await resetPasswordForEmail(supabase, email);
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signOutUser = useCallback(async () => {
    if (!supabase) return;
    await signOut(supabase);
    clearForYouFeedCache();
    clearLibraryState();
    setLibraryCloudSyncState("signed_out");
  }, [clearLibraryState, supabase]);

  const registerPasskey = useCallback(
    async (friendlyName: string, onStep?: (step: PasskeyRegistrationStep) => void) => {
      if (!supabase) return { error: "Supabase is not configured." };
      return registerPasskeyWithApi(friendlyName, onStep);
    },
    [supabase],
  );

  const signInWithPasskey = useCallback(
    async (email: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      const result = await signInWithPasskeyApi(email);
      if (result.error) return result;
      await supabase.auth.getSession();
      return { error: null };
    },
    [supabase],
  );

  const deletePasskey = useCallback(
    async (id: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      return deletePasskeyFromDb(supabase, id);
    },
    [supabase],
  );

  const listPasskeys = useCallback(async () => {
    if (!supabase) {
      return { factors: [], error: "Supabase is not configured." };
    }
    return listPasskeysFromDb(supabase);
  }, [supabase]);

  const getPendingSupabaseMfaCb = useCallback(async () => {
    if (!supabase) {
      return { needsMfa: false, factors: [], error: "Supabase is not configured." };
    }
    return getPendingSupabaseMfa(supabase);
  }, [supabase]);

  const completeTotpMfaCb = useCallback(
    async (factorId: string, code: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      return completeTotpMfa(supabase, code, factorId);
    },
    [supabase],
  );

  const sendPhoneMfaChallengeCb = useCallback(
    async (factorId: string) => {
      if (!supabase) {
        return { challengeId: null, error: "Supabase is not configured." };
      }
      return sendPhoneMfaChallenge(supabase, factorId);
    },
    [supabase],
  );

  const completePhoneMfaCb = useCallback(
    async (factorId: string, challengeId: string, code: string) => {
      if (!supabase) return { error: "Supabase is not configured." };
      return completePhoneMfa(supabase, factorId, challengeId, code);
    },
    [supabase],
  );

  const addSavedChannel = useCallback(
    async (input: {
      name: string;
      channelId?: string;
      channelUrl?: string;
      thumbnailUrl?: string;
      searchQuery?: string;
      entryKind?: SavedChannelEntryKind;
    }) => {
      if (!supabase || !user) return;
      const name = input.name.trim();
      if (!name) return;
      const entryKind = input.entryKind ?? "saved_channel";
      const next: SavedChannel = {
        id: randomId(),
        name,
        channelId: input.channelId,
        channelUrl: input.channelUrl,
        thumbnailUrl: input.thumbnailUrl?.trim() || undefined,
        searchQuery: (input.searchQuery ?? name).trim(),
        entryKind,
      };

      if (savedChannels.some((channel) => isDuplicateSavedLibraryEntry(channel, next))) {
        return;
      }

      const updated = [next, ...savedChannels];
      setSavedChannels(updated);
      try {
        await upsertSavedChannels(supabase, user.id, [next]);
      } catch {
        setSavedChannels(savedChannels);
      }
    },
    [savedChannels, supabase, user],
  );

  const removeSavedChannel = useCallback(
    async (id: string) => {
      if (!supabase || !user) return;
      const removed = savedChannels.find((channel) => channel.id === id);
      if (!removed) return;
      const updated = savedChannels.filter((channel) => channel.id !== id);
      setSavedChannels(updated);
      try {
        await deleteSavedChannelById(supabase, user.id, id);
      } catch {
        setSavedChannels(savedChannels);
      }
    },
    [savedChannels, supabase, user],
  );

  const updateSavedChannel = useCallback(
    async (id: string, patch: Partial<Omit<SavedChannel, "id">>) => {
      if (!supabase || !user) return;
      const existing = savedChannels.find((channel) => channel.id === id);
      if (!existing) return;

      const next: SavedChannel = {
        ...existing,
        ...patch,
        id: existing.id,
        name: (patch.name ?? existing.name).trim() || existing.name,
        searchQuery:
          (patch.searchQuery ?? existing.searchQuery).trim() ||
          existing.searchQuery,
        channelId: patch.channelId ?? existing.channelId,
        channelUrl: patch.channelUrl ?? existing.channelUrl,
        thumbnailUrl: patch.thumbnailUrl ?? existing.thumbnailUrl,
        entryKind:
          patch.entryKind ??
          existing.entryKind ??
          effectiveSavedChannelKind({
            channelId: patch.channelId ?? existing.channelId,
            channelUrl: patch.channelUrl ?? existing.channelUrl,
            thumbnailUrl: patch.thumbnailUrl ?? existing.thumbnailUrl,
          }),
      };
      const updated = mergeSavedChannels(
        [next, ...savedChannels.filter((channel) => channel.id !== id)],
        [],
      );

      setSavedChannels(updated);
      try {
        await upsertSavedChannels(supabase, user.id, [next]);
      } catch {
        setSavedChannels(savedChannels);
      }
    },
    [savedChannels, supabase, user],
  );

  const addOrUpdateWatchLater = useCallback(
    async (input: {
      videoId: string;
      title: string;
      thumbnailUrl: string;
      channelName: string;
      startSeconds?: number;
    }) => {
      if (!supabase || !user) return;
      const videoId = input.videoId.trim();
      if (!videoId) return;
      const existing = watchLaterEntries.find((entry) => entry.videoId === videoId);
      const next: WatchLaterEntry = {
        entryId: existing?.entryId ?? randomId(),
        videoId,
        title: input.title.trim() || "Video",
        thumbnailUrl: input.thumbnailUrl,
        channelName: input.channelName.trim() || "Unknown channel",
        startSeconds:
          input.startSeconds != null && input.startSeconds > 0
            ? Math.floor(input.startSeconds)
            : undefined,
        addedAt: existing?.addedAt ?? new Date().toISOString(),
      };
      const updated = [next, ...watchLaterEntries.filter((e) => e.videoId !== videoId)];
      setWatchLaterEntries(updated);
      try {
        await upsertWatchLaterEntries(supabase, user.id, [next]);
      } catch {
        setWatchLaterEntries(watchLaterEntries);
      }
    },
    [supabase, user, watchLaterEntries],
  );

  const removeWatchLaterByVideoId = useCallback(
    async (videoId: string) => {
      if (!supabase || !user) return;
      const updated = watchLaterEntries.filter((entry) => entry.videoId !== videoId);
      setWatchLaterEntries(updated);
      try {
        await deleteWatchLaterByVideoId(supabase, user.id, videoId);
      } catch {
        setWatchLaterEntries(watchLaterEntries);
      }
    },
    [supabase, user, watchLaterEntries],
  );

  const clearWatchLater = useCallback(async () => {
    if (!supabase || !user) return;
    setWatchLaterEntries([]);
    try {
      await deleteAllWatchLater(supabase, user.id);
    } catch {
      /* keep empty local state */
    }
  }, [supabase, user]);

  const isInWatchLaterFn = useCallback(
    (videoId: string) => watchLaterEntries.some((entry) => entry.videoId === videoId),
    [watchLaterEntries],
  );

  const upsertWatchProgress = useCallback(
    async (input: WatchProgressInput, options?: WatchProgressUpsertOptions) => {
      if (!supabase || !user || !input.videoId.trim()) return;
      const syncCloud = options?.syncCloud ?? true;
      const memoryOnly = !syncCloud;
      const normalized = normalizeProgressInput(input);

      let snapshotForCloud: WatchProgressEntry | null = null;

      setWatchProgress((prev) => {
        const liveMap = watchProgressLiveRef.current;
        const existingBase = prev.find(
          (entry) => entry.videoId === normalized.videoId,
        );
        const existing = existingBase
          ? mergeWatchProgressLivePatch(
              existingBase,
              liveMap.get(normalized.videoId),
            )
          : undefined;

        const nextLastPosition = existing
          ? Math.max(
              existing.lastPositionSeconds,
              normalized.lastPositionSeconds,
            )
          : normalized.lastPositionSeconds;
        const nextCompleted =
          normalized.completed === true
            ? true
            : existing?.completed === true && normalized.completed === false
              ? false
              : existing?.completed === true;
        const nextEverCompleted =
          nextCompleted === true
            ? true
            : existing?.everCompleted === true || existing?.completed === true;

        const nextDuration =
          normalized.durationSeconds !== undefined
            ? normalized.durationSeconds
            : existing?.durationSeconds;

        if (memoryOnly && existing) {
          if (
            existing.lastPositionSeconds === nextLastPosition &&
            existing.completed === nextCompleted &&
            (existing.durationSeconds ?? undefined) ===
              (nextDuration ?? undefined)
          ) {
            snapshotForCloud = null;
            return prev;
          }
          liveMap.set(normalized.videoId, {
            lastPositionSeconds: nextLastPosition,
            durationSeconds: nextDuration,
            completed: nextCompleted,
          });
          snapshotForCloud = null;
          return prev;
        }

        liveMap.delete(normalized.videoId);

        let nextEntry: WatchProgressEntry;

        if (existing) {
          nextEntry = {
            ...existing,
            ...normalized,
            lastPositionSeconds: nextLastPosition,
            completed: nextCompleted,
            everCompleted: nextEverCompleted ? true : undefined,
            durationSeconds: nextDuration,
          };
        } else {
          nextEntry = {
            ...normalized,
            lastPositionSeconds: nextLastPosition,
            completed: nextCompleted,
            everCompleted: nextEverCompleted ? true : undefined,
            durationSeconds: nextDuration,
          };
        }

        snapshotForCloud = nextEntry;
        return [
          nextEntry,
          ...prev.filter((entry) => entry.videoId !== normalized.videoId),
        ].sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
      });

      if (syncCloud && snapshotForCloud) {
        void upsertWatchProgressEntries(supabase, user.id, [snapshotForCloud]).catch(
          () => {
            /* keep optimistic state if cloud sync fails */
          },
        );
      }
    },
    [supabase, user],
  );

  const removeWatchProgressByVideoId = useCallback(
    async (videoId: string) => {
      if (!supabase || !user) return;
      watchProgressLiveRef.current.delete(videoId);
      const updated = watchProgress.filter((entry) => entry.videoId !== videoId);
      setWatchProgress(updated);
      try {
        await deleteWatchProgressByVideoId(supabase, user.id, videoId);
      } catch {
        setWatchProgress(watchProgress);
      }
    },
    [supabase, user, watchProgress],
  );

  const clearWatchProgress = useCallback(async () => {
    if (!supabase || !user) return;
    watchProgressLiveRef.current.clear();
    setWatchProgress([]);
    try {
      await deleteAllWatchProgress(supabase, user.id);
    } catch {
      /* keep empty local state */
    }
  }, [supabase, user]);

  const getProgressByVideoId = useCallback(
    (videoId: string) => {
      const base = watchProgress.find((entry) => entry.videoId === videoId);
      if (!base) return undefined;
      return mergeWatchProgressLivePatch(
        base,
        watchProgressLiveRef.current.get(videoId),
      );
    },
    [watchProgress],
  );

  const getResumeSeconds = useCallback(
    (videoId: string, watchLaterStartSeconds?: number) =>
      deriveResumeSeconds(getProgressByVideoId(videoId), watchLaterStartSeconds),
    [getProgressByVideoId],
  );

  const getRecentSearches = useCallback(() => recentSearches, [recentSearches]);

  const addRecentSearch = useCallback(
    async (query: string) => {
      if (!supabase || !user) return;
      const next = prependRecentSearchQuery(recentSearches, query);
      setRecentSearches(next);
      try {
        await upsertRecentSearch(supabase, user.id, normalizeRecentSearchQuery(query));
        await trimRecentSearchesToCap(supabase, user.id, RECENT_SEARCHES_MAX_ITEMS);
      } catch {
        setRecentSearches(recentSearches);
      }
    },
    [recentSearches, supabase, user],
  );

  const clearRecentSearches = useCallback(async () => {
    if (!supabase || !user) return;
    setRecentSearches([]);
    try {
      await deleteAllRecentSearches(supabase, user.id);
    } catch {
      /* keep empty local state */
    }
  }, [supabase, user]);

  const removeRecentSearch = useCallback(
    async (query: string) => {
      if (!supabase || !user) return;
      const next = removeRecentSearchQuery(recentSearches, query);
      setRecentSearches(next);
      try {
        await deleteRecentSearchByQuery(supabase, user.id, query);
      } catch {
        setRecentSearches(recentSearches);
      }
    },
    [recentSearches, supabase, user],
  );

  const canPersistLibrary = user != null && isCloudConfigured;

  const effectiveLibraryCloudSyncState: LibraryCloudSyncState =
    supabase == null ? "unavailable" : libraryCloudSyncState;

  const value = useMemo<CloudLibraryContextValue>(
    () => ({
      authStatus,
      localLibraryHydrated,
      isCloudConfigured,
      canPersistLibrary,
      libraryCloudSyncState: effectiveLibraryCloudSyncState,
      session,
      user,
      watchLaterEntries,
      savedChannels,
      watchProgress,
      inProgressEntries: sortWatchProgressByRecency(
        watchProgress
          .map((entry) =>
            mergeWatchProgressLivePatch(
              entry,
              watchProgressLiveRef.current.get(entry.videoId),
            ),
          )
          .filter(isFreshInProgress),
      ),
      signIn,
      signUp,
      resetPassword,
      signOutUser,
      addSavedChannel,
      updateSavedChannel,
      removeSavedChannel,
      addOrUpdateWatchLater,
      removeWatchLaterByVideoId,
      clearWatchLater,
      isInWatchLater: isInWatchLaterFn,
      upsertWatchProgress,
      removeWatchProgressByVideoId,
      clearWatchProgress,
      getProgressByVideoId,
      getResumeSeconds,
      getRecentSearches,
      addRecentSearch,
      clearRecentSearches,
      removeRecentSearch,
      passkeysSupported,
      registerPasskey,
      signInWithPasskey,
      deletePasskey,
      listPasskeys,
      getPendingSupabaseMfa: getPendingSupabaseMfaCb,
      completeTotpMfa: completeTotpMfaCb,
      sendPhoneMfaChallenge: sendPhoneMfaChallengeCb,
      completePhoneMfa: completePhoneMfaCb,
    }),
    [
      addOrUpdateWatchLater,
      addRecentSearch,
      addSavedChannel,
      authStatus,
      canPersistLibrary,
      clearRecentSearches,
      clearWatchLater,
      clearWatchProgress,
      completePhoneMfaCb,
      completeTotpMfaCb,
      deletePasskey,
      effectiveLibraryCloudSyncState,
      getPendingSupabaseMfaCb,
      getProgressByVideoId,
      getRecentSearches,
      getResumeSeconds,
      isCloudConfigured,
      isInWatchLaterFn,
      listPasskeys,
      localLibraryHydrated,
      passkeysSupported,
      registerPasskey,
      removeRecentSearch,
      removeSavedChannel,
      removeWatchLaterByVideoId,
      removeWatchProgressByVideoId,
      resetPassword,
      savedChannels,
      sendPhoneMfaChallengeCb,
      session,
      signIn,
      signInWithPasskey,
      signOutUser,
      signUp,
      updateSavedChannel,
      upsertWatchProgress,
      user,
      watchLaterEntries,
      watchProgress,
    ],
  );

  return (
    <CloudLibraryContext.Provider value={value}>
      {children}
    </CloudLibraryContext.Provider>
  );
}

export function useCloudLibrary() {
  const value = useContext(CloudLibraryContext);
  if (!value) {
    throw new Error("useCloudLibrary must be used within CloudLibraryProvider");
  }
  return value;
}
