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
  clearLocalLibraryStorage,
  writeLocalLibraryMirror,
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

/** Signed-in cloud library sync phase; when `synced`, UI reflects the last successful cloud snapshot (mirrored to localStorage). */
export type LibraryCloudSyncState =
  | "unavailable"
  | "local_only"
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
  persistLocal?: boolean;
  syncCloud?: boolean;
};

type CloudLibraryContextValue = {
  authStatus: AuthStatus;
  isCloudConfigured: boolean;
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
    /** Defaults to `"saved_channel"` when omitted so older callers behave as channel saves. */
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

/** Dedupe identical rows when inserting (explicit kind first). */
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
    lastWatchedAt: now,
    updatedAt: now,
  };
}

/** In-memory-only playback samples merge here so React state does not re-render every tick. */
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
    completed: base.completed || patch.completed,
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
  /** Latest playback fields while sampling; avoids context churn on 1s ticks (esp. mobile Safari). */
  const watchProgressLiveRef = useRef<Map<string, WatchProgressLivePatch>>(new Map());
  const [passkeysSupported, setPasskeysSupported] = useState(false);
  const [libraryCloudSyncState, setLibraryCloudSyncState] =
    useState<LibraryCloudSyncState>("local_only");

  /** Coalesced payload for deferred `writeLocalWatchProgress` (idle / setTimeout). */
  const watchProgressDiskQueueRef = useRef<WatchProgressEntry[] | null>(null);
  const watchProgressDiskIdleIdRef = useRef<number | null>(null);

  const cancelDeferredWatchProgressDiskWrite = useCallback(() => {
    const id = watchProgressDiskIdleIdRef.current;
    if (id == null) return;
    if (typeof cancelIdleCallback === "function") {
      cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
    watchProgressDiskIdleIdRef.current = null;
  }, []);

  const scheduleDeferredWatchProgressDiskWrite = useCallback(
    (entries: WatchProgressEntry[]) => {
      watchProgressDiskQueueRef.current = entries;
      if (watchProgressDiskIdleIdRef.current != null) return;
      const flush = () => {
        watchProgressDiskIdleIdRef.current = null;
        const latest = watchProgressDiskQueueRef.current;
        if (latest) {
          writeLocalWatchProgress(latest);
        }
      };
      watchProgressDiskIdleIdRef.current =
        typeof requestIdleCallback !== "undefined"
          ? requestIdleCallback(flush, { timeout: 2_000 })
          : window.setTimeout(flush, 0);
    },
    [],
  );

  const persistLocalSnapshot = useCallback(
    (
      next: {
        watchLater?: WatchLaterEntry[];
        savedChannels?: SavedChannel[];
        watchProgress?: WatchProgressEntry[];
      },
      diskOptions?: { deferWatchProgressDisk?: boolean },
    ) => {
      if (next.watchLater !== undefined) {
        writeLocalWatchLater(next.watchLater);
      }
      if (next.savedChannels !== undefined) {
        writeLocalSavedChannels(next.savedChannels);
      }
      if (next.watchProgress !== undefined) {
        if (diskOptions?.deferWatchProgressDisk) {
          scheduleDeferredWatchProgressDiskWrite(next.watchProgress);
        } else {
          cancelDeferredWatchProgressDiskWrite();
          writeLocalWatchProgress(next.watchProgress);
          watchProgressDiskQueueRef.current = null;
        }
      }
    },
    [
      cancelDeferredWatchProgressDiskWrite,
      scheduleDeferredWatchProgressDiskWrite,
    ],
  );

  useLayoutEffect(
    () => () => {
      cancelDeferredWatchProgressDiskWrite();
      const pending = watchProgressDiskQueueRef.current;
      if (pending) {
        writeLocalWatchProgress(pending);
        watchProgressDiskQueueRef.current = null;
      }
    },
    [cancelDeferredWatchProgressDiskWrite],
  );

  const hydrateFromLocal = useCallback(() => {
    const snapshot = readLocalSnapshot();
    watchProgressLiveRef.current.clear();
    setWatchLaterEntries(snapshot.watchLater);
    setSavedChannels(snapshot.savedChannels);
    setWatchProgress(snapshot.watchProgress);
  }, []);

  const syncFromCloud = useCallback(
    async (nextUser: User) => {
      if (!supabase) return;
      setLibraryCloudSyncState("syncing");

      /* Wait for JWT on the browser client; otherwise RLS returns no rows. */
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
        setLibraryCloudSyncState("error");
        return;
      }

      try {
        const localSnapshot = readLocalSnapshot();
        const remote = await fetchCloudSnapshot(supabase);

        const cloudEmpty =
          remote.savedChannels.length === 0 &&
          remote.watchLater.length === 0 &&
          remote.watchProgress.length === 0;
        const localHasData =
          localSnapshot.savedChannels.length > 0 ||
          localSnapshot.watchLater.length > 0 ||
          localSnapshot.watchProgress.length > 0;

        let nextWatchLater: WatchLaterEntry[];
        let nextSaved: SavedChannel[];
        let nextProgress: WatchProgressEntry[];

        if (cloudEmpty && localHasData) {
          await Promise.all([
            replaceWatchLaterEntries(
              supabase,
              nextUser.id,
              localSnapshot.watchLater,
            ),
            replaceSavedChannels(
              supabase,
              nextUser.id,
              localSnapshot.savedChannels,
            ),
            replaceWatchProgressEntries(
              supabase,
              nextUser.id,
              localSnapshot.watchProgress,
            ),
          ]);
          nextWatchLater = localSnapshot.watchLater;
          nextSaved = localSnapshot.savedChannels;
          nextProgress = localSnapshot.watchProgress;
        } else {
          nextWatchLater = remote.watchLater.map((e) => ({ ...e }));
          nextSaved = remote.savedChannels.map((c) => ({ ...c }));
          nextProgress = remote.watchProgress.map((p) => ({ ...p }));
        }

        watchProgressLiveRef.current.clear();
        setWatchLaterEntries(nextWatchLater);
        setSavedChannels(nextSaved);
        setWatchProgress(nextProgress);
        writeLocalLibraryMirror({
          watchLater: nextWatchLater,
          savedChannels: nextSaved,
          watchProgress: nextProgress,
        });
        setLibraryCloudSyncState("synced");
      } catch (err) {
        setLibraryCloudSyncState("error");
        throw err;
      }
    },
    [supabase],
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
          setLibraryCloudSyncState("error");
        }
      }
      if (!cancelled) setAuthStatus("ready");
    })();

    const { data } = subscribeToAuthChanges(supabase, (nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void syncFromCloud(nextSession.user).catch(() => {
          setLibraryCloudSyncState("error");
        });
      } else {
        setLibraryCloudSyncState(supabase ? "local_only" : "unavailable");
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
    clearLocalLibraryStorage();
    setLibraryCloudSyncState("local_only");
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
      thumbnailUrl?: string;
      searchQuery?: string;
      entryKind?: SavedChannelEntryKind;
    }) => {
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

      const updated = savedChannels.some((channel) =>
        isDuplicateSavedLibraryEntry(channel, next),
      )
        ? savedChannels
        : [next, ...savedChannels];

      setSavedChannels(updated);
      persistLocalSnapshot({ savedChannels: updated });
      if (supabase && user && updated !== savedChannels) {
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
      const removed = savedChannels.find((channel) => channel.id === id);
      const updated = savedChannels.filter((channel) => channel.id !== id);
      setSavedChannels(updated);
      persistLocalSnapshot({ savedChannels: updated });
      if (supabase && user && removed) {
        try {
          await replaceSavedChannels(supabase, user.id, updated);
        } catch {
          /* keep local state if cloud sync fails */
        }
      }
    },
    [persistLocalSnapshot, savedChannels, supabase, user],
  );

  const updateSavedChannel = useCallback(
    async (id: string, patch: Partial<Omit<SavedChannel, "id">>) => {
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
      const memoryOnly = !persistLocal && !syncCloud;
      const normalized = normalizeProgressInput(input);

      let snapshotForDisk: WatchProgressEntry[] = [];
      let rowForCloud: WatchProgressEntry | null = null;

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
          (existing?.completed === true) || normalized.completed === true;

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
            rowForCloud = null;
            return prev;
          }
          liveMap.set(normalized.videoId, {
            lastPositionSeconds: nextLastPosition,
            durationSeconds: nextDuration,
            completed: nextCompleted,
          });
          rowForCloud = null;
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
            durationSeconds: nextDuration,
          };
        } else {
          nextEntry = {
            ...normalized,
            lastPositionSeconds: nextLastPosition,
            completed: nextCompleted,
            durationSeconds: nextDuration,
          };
        }

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
        persistLocalSnapshot(
          { watchProgress: snapshotForDisk },
          { deferWatchProgressDisk: persistLocal && !syncCloud },
        );
      }
      if (syncCloud && supabase && user && rowForCloud) {
        void upsertWatchProgressEntries(supabase, user.id, [rowForCloud]).catch(
          () => {
            /* keep local state if cloud sync fails */
          },
        );
      }
    },
    [persistLocalSnapshot, supabase, user],
  );

  const removeWatchProgressByVideoId = useCallback(
    async (videoId: string) => {
      watchProgressLiveRef.current.delete(videoId);
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
    watchProgressLiveRef.current.clear();
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

  const effectiveLibraryCloudSyncState: LibraryCloudSyncState =
    supabase == null ? "unavailable" : libraryCloudSyncState;

  const value = useMemo<CloudLibraryContextValue>(
    () => ({
      authStatus,
      isCloudConfigured,
      libraryCloudSyncState: effectiveLibraryCloudSyncState,
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
      effectiveLibraryCloudSyncState,
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
      updateSavedChannel,
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
