"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchCloudSnapshot,
  getInitialSession,
  replaceSavedChannels,
  replaceWatchLaterEntries,
  replaceWatchProgressEntries,
  resetPasswordForEmail,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuthChanges,
  upsertWatchProgressEntries,
} from "@/lib/cloudLibrary/cloudStore";
import {
  readLocalSnapshot,
  SAVED_CHANNELS_STORAGE_KEY,
  WATCH_LATER_STORAGE_KEY,
  WATCH_PROGRESS_STORAGE_KEY,
  writeLocalSavedChannels,
  writeLocalWatchLater,
  writeLocalWatchProgress,
} from "@/lib/cloudLibrary/localStore";
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
  isInProgress,
  mergeSavedChannels,
  mergeWatchLaterEntries,
  mergeWatchProgressEntries,
} from "@/lib/cloudLibrary/sync";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import type { SavedChannel } from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

type AuthStatus = "loading" | "ready";

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
  persistLocal?: boolean;
  syncCloud?: boolean;
};

type CloudLibraryContextValue = {
  authStatus: AuthStatus;
  isCloudConfigured: boolean;
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
    searchQuery?: string;
  }) => Promise<void>;
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

function sameChannel(a: SavedChannel, b: Partial<SavedChannel>): boolean {
  if (a.channelId && b.channelId && a.channelId === b.channelId) return true;
  if (a.channelUrl && b.channelUrl && a.channelUrl === b.channelUrl) return true;
  if (
    b.searchQuery &&
    a.searchQuery.trim().toLowerCase() === b.searchQuery.trim().toLowerCase()
  ) {
    return true;
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
    lastWatchedAt: now,
    updatedAt: now,
  };
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
  const [passkeysSupported, setPasskeysSupported] = useState(false);

  const persistLocalSnapshot = useCallback(
    (next: {
      watchLater?: WatchLaterEntry[];
      savedChannels?: SavedChannel[];
      watchProgress?: WatchProgressEntry[];
    }) => {
      if (next.watchLater !== undefined) writeLocalWatchLater(next.watchLater);
      if (next.savedChannels !== undefined) {
        writeLocalSavedChannels(next.savedChannels);
      }
      if (next.watchProgress !== undefined) {
        writeLocalWatchProgress(next.watchProgress);
      }
    },
    [],
  );

  const hydrateFromLocal = useCallback(() => {
    const snapshot = readLocalSnapshot();
    setWatchLaterEntries(snapshot.watchLater);
    setSavedChannels(snapshot.savedChannels);
    setWatchProgress(snapshot.watchProgress);
  }, []);

  const syncFromCloud = useCallback(
    async (nextUser: User) => {
      if (!supabase) return;
      const localSnapshot = readLocalSnapshot();
      const remoteSnapshot = await fetchCloudSnapshot(supabase);
      const mergedWatchLater = mergeWatchLaterEntries(
        localSnapshot.watchLater,
        remoteSnapshot.watchLater,
      );
      const mergedSavedChannels = mergeSavedChannels(
        localSnapshot.savedChannels,
        remoteSnapshot.savedChannels,
      );
      const mergedWatchProgress = mergeWatchProgressEntries(
        localSnapshot.watchProgress,
        remoteSnapshot.watchProgress,
      );

      await Promise.all([
        replaceWatchLaterEntries(supabase, nextUser.id, mergedWatchLater),
        replaceSavedChannels(supabase, nextUser.id, mergedSavedChannels),
        upsertWatchProgressEntries(supabase, nextUser.id, mergedWatchProgress),
      ]);

      setWatchLaterEntries(mergedWatchLater);
      setSavedChannels(mergedSavedChannels);
      setWatchProgress(mergedWatchProgress);
      persistLocalSnapshot({
        watchLater: mergedWatchLater,
        savedChannels: mergedSavedChannels,
        watchProgress: mergedWatchProgress,
      });
    },
    [persistLocalSnapshot, supabase],
  );

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once on client
    hydrateFromLocal();
  }, [hydrateFromLocal]);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detect WebAuthn once on client after mount
    setPasskeysSupported(browserSupportsPasskeys());
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage) return;
      if (
        e.key !== WATCH_PROGRESS_STORAGE_KEY &&
        e.key !== WATCH_LATER_STORAGE_KEY &&
        e.key !== SAVED_CHANNELS_STORAGE_KEY
      ) {
        return;
      }
      hydrateFromLocal();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrateFromLocal]);

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
          hydrateFromLocal();
        }
      }
      if (!cancelled) setAuthStatus("ready");
    })();

    const { data } = subscribeToAuthChanges(supabase, (nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void syncFromCloud(nextSession.user).catch(() => {
          hydrateFromLocal();
        });
      } else {
        hydrateFromLocal();
      }
      setAuthStatus("ready");
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [hydrateFromLocal, supabase, syncFromCloud]);

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
    hydrateFromLocal();
  }, [hydrateFromLocal, supabase]);

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
      searchQuery?: string;
    }) => {
      const name = input.name.trim();
      if (!name) return;
      const next: SavedChannel = {
        id: randomId(),
        name,
        channelId: input.channelId,
        channelUrl: input.channelUrl,
        searchQuery: (input.searchQuery ?? name).trim(),
      };

      const updated = savedChannels.some((channel) =>
        sameChannel(channel, {
          channelId: next.channelId,
          channelUrl: next.channelUrl,
          searchQuery: next.searchQuery,
        }),
      )
        ? savedChannels
        : [next, ...savedChannels];

      setSavedChannels(updated);
      persistLocalSnapshot({ savedChannels: updated });
      if (supabase && user) {
        try {
          await replaceSavedChannels(supabase, user.id, updated);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, savedChannels, supabase, user],
  );

  const removeSavedChannel = useCallback(
    async (id: string) => {
      const updated = savedChannels.filter((channel) => channel.id !== id);
      setSavedChannels(updated);
      persistLocalSnapshot({ savedChannels: updated });
      if (supabase && user) {
        try {
          await replaceSavedChannels(supabase, user.id, updated);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, savedChannels, supabase, user],
  );

  const addOrUpdateWatchLater = useCallback(
    async (input: {
      videoId: string;
      title: string;
      thumbnailUrl: string;
      channelName: string;
      startSeconds?: number;
    }) => {
      const videoId = input.videoId.trim();
      if (!videoId) return;
      const next: WatchLaterEntry = {
        entryId: randomId(),
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
      const updated = [next, ...watchLaterEntries.filter((e) => e.videoId !== videoId)];
      setWatchLaterEntries(updated);
      persistLocalSnapshot({ watchLater: updated });
      if (supabase && user) {
        try {
          await replaceWatchLaterEntries(supabase, user.id, updated);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, supabase, user, watchLaterEntries],
  );

  const removeWatchLaterByVideoId = useCallback(
    async (videoId: string) => {
      const updated = watchLaterEntries.filter((entry) => entry.videoId !== videoId);
      setWatchLaterEntries(updated);
      persistLocalSnapshot({ watchLater: updated });
      if (supabase && user) {
        try {
          await replaceWatchLaterEntries(supabase, user.id, updated);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, supabase, user, watchLaterEntries],
  );

  const clearWatchLater = useCallback(async () => {
    setWatchLaterEntries([]);
    persistLocalSnapshot({ watchLater: [] });
    if (supabase && user) {
      try {
        await replaceWatchLaterEntries(supabase, user.id, []);
      } catch {
        /* keep local state if cloud sync fails */
      }
    }
  }, [persistLocalSnapshot, supabase, user]);

  const isInWatchLaterFn = useCallback(
    (videoId: string) => watchLaterEntries.some((entry) => entry.videoId === videoId),
    [watchLaterEntries],
  );

  const upsertWatchProgress = useCallback(
    async (input: WatchProgressInput, options?: WatchProgressUpsertOptions) => {
      if (!input.videoId.trim()) return;
      const persistLocal = options?.persistLocal ?? true;
      const syncCloud = options?.syncCloud ?? true;
      const normalized = normalizeProgressInput(input);

      let snapshotForDisk: WatchProgressEntry[] = [];
      let rowForCloud: WatchProgressEntry | null = null;

      setWatchProgress((prev) => {
        const existing = prev.find(
          (entry) => entry.videoId === normalized.videoId,
        );
        const nextEntry: WatchProgressEntry = existing
          ? {
              ...existing,
              ...normalized,
              lastPositionSeconds: Math.max(
                existing.lastPositionSeconds,
                normalized.lastPositionSeconds,
              ),
              completed: existing.completed || normalized.completed,
            }
          : normalized;

        rowForCloud = nextEntry;
        const updated = [
          nextEntry,
          ...prev.filter((entry) => entry.videoId !== normalized.videoId),
        ].sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
        snapshotForDisk = updated;
        return updated;
      });

      if (persistLocal) {
        persistLocalSnapshot({ watchProgress: snapshotForDisk });
      }
      if (syncCloud && supabase && user && rowForCloud) {
        try {
          await upsertWatchProgressEntries(supabase, user.id, [rowForCloud]);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, supabase, user],
  );

  const removeWatchProgressByVideoId = useCallback(
    async (videoId: string) => {
      const updated = watchProgress.filter((entry) => entry.videoId !== videoId);
      setWatchProgress(updated);
      persistLocalSnapshot({ watchProgress: updated });
      if (supabase && user) {
        try {
          await replaceWatchProgressEntries(supabase, user.id, updated);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, supabase, user, watchProgress],
  );

  const clearWatchProgress = useCallback(async () => {
    setWatchProgress([]);
    persistLocalSnapshot({ watchProgress: [] });
    if (supabase && user) {
      try {
        await replaceWatchProgressEntries(supabase, user.id, []);
      } catch {
        /* keep local state if cloud sync fails */
      }
    }
  }, [persistLocalSnapshot, supabase, user]);

  const getProgressByVideoId = useCallback(
    (videoId: string) => watchProgress.find((entry) => entry.videoId === videoId),
    [watchProgress],
  );

  const getResumeSeconds = useCallback(
    (videoId: string, watchLaterStartSeconds?: number) =>
      deriveResumeSeconds(getProgressByVideoId(videoId), watchLaterStartSeconds),
    [getProgressByVideoId],
  );

  const value = useMemo<CloudLibraryContextValue>(
    () => ({
      authStatus,
      isCloudConfigured,
      session,
      user,
      watchLaterEntries,
      savedChannels,
      watchProgress,
      inProgressEntries: watchProgress.filter(isInProgress),
      signIn,
      signUp,
      resetPassword,
      signOutUser,
      addSavedChannel,
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
      addSavedChannel,
      authStatus,
      clearWatchLater,
      clearWatchProgress,
      completePhoneMfaCb,
      completeTotpMfaCb,
      deletePasskey,
      getPendingSupabaseMfaCb,
      getProgressByVideoId,
      getResumeSeconds,
      isCloudConfigured,
      isInWatchLaterFn,
      listPasskeys,
      passkeysSupported,
      registerPasskey,
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
