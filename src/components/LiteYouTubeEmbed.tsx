"use client";

import Box from "@mui/material/Box";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { isNearlyCompleteWatch } from "@/lib/cloudLibrary/sync";
import { useGlobalYoutubeShortcuts } from "@/hooks/useGlobalYoutubeShortcuts";
import {
  ensurePlayerVolume100,
  primeCaptionsModule,
} from "@/lib/youtubePlayerControls";
import {
  getAttachedLiteYoutubePlayer,
  isDocumentPictureInPictureActive,
  isLiteYoutubeElementActivated,
  isYoutubePlayerAttached,
  readPlayerCurrentTime,
  readPlayerDuration,
  releaseLiteYoutubePlayer,
  stopLiteYoutubePlayer,
} from "@/lib/youtubePlayer";
import { registerWatchPlayerStop } from "@/lib/watchPlayerLifecycle";

import "lite-youtube-embed/src/lite-yt-embed.css";

const PROGRESS_SAMPLE_INTERVAL_MS = 1_000;
/** Default 15s; see docs/decisions/watch-progress-persistence.md (Hobby may use 30s). */
const SIGNED_IN_CLOUD_SYNC_INTERVAL_MS = 15_000;
/**
 * Ignore brief iOS hidden blips (Control Center, notification shade) before
 * tearing down the youtube.com iframe. `pagehide` / `freeze` park immediately.
 */
const PARK_AFTER_HIDDEN_MS = 1_500;
/** Swallow lite-youtube's remount autoplay long enough to re-apply a user pause. */
const REMOUNT_PAUSE_HOLD_MS = 750;

let liteYtLoad: Promise<unknown> | null = null;
let liteYtModuleReady = false;

function loadLiteYt() {
  if (!liteYtLoad) {
    liteYtLoad = import("lite-youtube-embed/src/lite-yt-embed.js").then(
      (mod) => {
        liteYtModuleReady = true;
        const ctor = customElements.get("lite-youtube") as
          | (CustomElementConstructor & { warmConnections?: () => void })
          | undefined;
        ctor?.warmConnections?.();
        return mod;
      },
    );
  }
  return liteYtLoad;
}

/** Warm the lite-yt module during watch progress / auth resolution to avoid a second skeleton. */
export function preloadLiteYoutubeEmbed() {
  void loadLiteYt();
}

const THEATRE_VIEWPORT_RESERVE = "152px";

const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

type LiteYouTubeEmbedProps = {
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  channelName?: string;
  /** Iframe `start` in seconds (from `?t=` on the watch page). */
  startSeconds?: number;
  enableGlobalShortcuts?: boolean;
  theatreMaximize?: boolean;
  /** Shared shell ref for watch toolbar / external controls. */
  playerShellRef?: RefObject<HTMLDivElement | null>;
  onPlayerApiReady?: (ready: boolean) => void;
};

/** Lock iframe `start` for this video so progress saves do not remount the player. */
function useCommittedStartSeconds(videoId: string, startSeconds?: number) {
  const commitRef = useRef<{ videoId: string; start: number | undefined }>({
    videoId: "",
    start: undefined,
  });

  const normalizedStart =
    startSeconds != null &&
    Number.isFinite(startSeconds) &&
    startSeconds > 0
      ? Math.floor(startSeconds)
      : undefined;

  if (commitRef.current.videoId !== videoId) {
    commitRef.current = { videoId, start: normalizedStart };
  } else if (
    (commitRef.current.start == null || commitRef.current.start <= 0) &&
    normalizedStart != null &&
    normalizedStart > 0
  ) {
    commitRef.current.start = normalizedStart;
  }

  return commitRef.current.start;
}

export function LiteYouTubeEmbed({
  videoId,
  title,
  thumbnailUrl,
  channelName,
  startSeconds,
  enableGlobalShortcuts = true,
  theatreMaximize = false,
  playerShellRef,
  onPlayerApiReady,
}: LiteYouTubeEmbedProps) {
  const { upsertWatchProgress, canPersistLibrary } = useCloudLibrary();
  const [ready, setReady] = useState(liteYtModuleReady);
  const [playerGeneration, setPlayerGeneration] = useState(0);
  /** True while the youtube.com iframe is torn down (tab hidden / frozen). */
  const [parked, setParked] = useState(false);
  const [resumeSeconds, setResumeSeconds] = useState<number | undefined>(
    undefined,
  );
  const parkedRef = useRef(false);
  const resumeSecondsRef = useRef<number | undefined>(undefined);
  const shellRef = useRef<HTMLDivElement>(null);
  const assignShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      shellRef.current = node;
      if (playerShellRef && "current" in playerShellRef) {
        (
          playerShellRef as RefObject<HTMLDivElement | null> & {
            current: HTMLDivElement | null;
          }
        ).current = node;
      }
    },
    [playerShellRef],
  );
  const ytPlayerRef = useRef<YT.Player | null>(null);
  const playerApiReadyRef = useRef(false);
  const lastRecordedSecondsRef = useRef(-1);
  const playingRef = useRef(false);
  /** User explicitly paused; do not resume on tab return or player remount. */
  const userPausedRef = useRef(false);
  const recordProgressRef = useRef<
    (opts?: { force?: boolean; syncCloud?: boolean }) => Promise<void>
  >(async () => {});

  const start = useCommittedStartSeconds(videoId, startSeconds);

  useEffect(() => {
    if (liteYtModuleReady) {
      setReady(true);
      return;
    }
    void loadLiteYt().then(() => setReady(true));
  }, []);

  useEffect(() => {
    ytPlayerRef.current = null;
    playerApiReadyRef.current = false;
    playingRef.current = false;
    userPausedRef.current = false;
    lastRecordedSecondsRef.current = -1;
    resumeSecondsRef.current = undefined;
    parkedRef.current = false;
    setParked(false);
    setResumeSeconds(undefined);
  }, [videoId]);

  useGlobalYoutubeShortcuts(
    shellRef,
    videoId,
    enableGlobalShortcuts && ready && !parked,
    playerApiReadyRef,
  );

  const iframeStart =
    resumeSeconds != null && resumeSeconds > 0 ? resumeSeconds : start;
  const params = new URLSearchParams();
  params.set("enablejsapi", "1");
  params.set("cc_load_policy", "0");
  params.set("cc_lang_pref", "en");
  if (iframeStart != null) params.set("start", String(iframeStart));

  const recordProgress = useCallback(
    async ({
      force = false,
      syncCloud = false,
    }: {
      force?: boolean;
      syncCloud?: boolean;
    } = {}) => {
      if (!canPersistLibrary) return;
      const root = shellRef.current;
      if (!root || !playerApiReadyRef.current) return;

      let player: YT.Player | null = ytPlayerRef.current;
      if (!isYoutubePlayerAttached(player)) {
        player = await getAttachedLiteYoutubePlayer(root);
        if (!player) {
          ytPlayerRef.current = null;
          return;
        }
        ytPlayerRef.current = player;
      }

      if (!player) return;

      const currentTime = readPlayerCurrentTime(player);
      if (currentTime == null) {
        ytPlayerRef.current = null;
        return;
      }

      let currentSeconds = Math.max(0, Math.floor(currentTime));
      const lastGood = lastRecordedSecondsRef.current;
      if (force && currentSeconds === 0 && lastGood > 0) {
        currentSeconds = lastGood;
      }

      const durationRaw = readPlayerDuration(player);
      const durationSeconds =
        durationRaw != null ? Math.floor(durationRaw) : undefined;
      const completed = isNearlyCompleteWatch(durationSeconds, currentSeconds);

      if (
        !force &&
        !syncCloud &&
        Math.abs(currentSeconds - lastRecordedSecondsRef.current) < 1
      ) {
        return;
      }

      lastRecordedSecondsRef.current = currentSeconds;
      void upsertWatchProgress(
        {
          videoId,
          title: title ?? "Video",
          thumbnailUrl:
            thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
          channelName: channelName ?? "Unknown channel",
          lastPositionSeconds: currentSeconds,
          durationSeconds,
          completed,
        },
        { syncCloud },
      );
    },
    [canPersistLibrary, channelName, thumbnailUrl, title, upsertWatchProgress, videoId],
  );

  recordProgressRef.current = recordProgress;

  const stopPlayer = useCallback(() => {
    stopLiteYoutubePlayer(ytPlayerRef.current);
    playingRef.current = false;
  }, []);

  const releasePlayer = useCallback(() => {
    releaseLiteYoutubePlayer(ytPlayerRef.current);
    ytPlayerRef.current = null;
    playerApiReadyRef.current = false;
    playingRef.current = false;
    onPlayerApiReady?.(false);
  }, [onPlayerApiReady]);

  useEffect(() => {
    const unregister = registerWatchPlayerStop(stopPlayer);
    return () => {
      unregister();
      releasePlayer();
    };
  }, [stopPlayer, releasePlayer]);

  useEffect(() => {
    if (!ready || parked) return;

    let cancelled = false;
    let attachedPlayer: YT.Player | null = null;
    let holdPause = userPausedRef.current;
    const clearHoldPause = window.setTimeout(() => {
      holdPause = false;
    }, REMOUNT_PAUSE_HOLD_MS);

    const onStateChange = (event: YT.OnStateChangeEvent) => {
      const player = attachedPlayer;
      if (!isYoutubePlayerAttached(player)) return;
      const state = event.data;
      if (state === YT.PlayerState.PLAYING) {
        if (holdPause) {
          try {
            player.pauseVideo();
          } catch {
            /* not ready */
          }
          playingRef.current = false;
          return;
        }
        userPausedRef.current = false;
        playingRef.current = true;
        void recordProgressRef.current();
        return;
      }
      playingRef.current = false;
      if (state === YT.PlayerState.PAUSED) {
        userPausedRef.current = true;
      }
      if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
        void recordProgressRef.current({
          force: true,
          syncCloud: true,
        });
      }
    };

    // The App Router keeps the watch page's DOM cached, so re-opening the same
    // video reconnects a <lite-youtube> that was already activated against a now
    // destroyed player. Reviving it in place races lite-youtube's async
    // activation and spawns a duplicate (background-audio) iframe, so force a
    // fresh element via the key bump instead; this effect re-runs cleanly after.
    if (isLiteYoutubeElementActivated(shellRef.current)) {
      window.clearTimeout(clearHoldPause);
      setPlayerGeneration((g) => g + 1);
      return;
    }

    void (async () => {
      const root = shellRef.current;
      if (!root) return;
      for (let i = 0; i < 80 && !cancelled; i++) {
        const player = await getAttachedLiteYoutubePlayer(root);
        if (cancelled || !player) {
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        attachedPlayer = player;
        ytPlayerRef.current = player;
        playerApiReadyRef.current = true;
        ensurePlayerVolume100(player);
        primeCaptionsModule(player);
        if (userPausedRef.current) {
          try {
            player.pauseVideo();
          } catch {
            /* not ready */
          }
          playingRef.current = false;
        }
        onPlayerApiReady?.(true);
        player.addEventListener("onStateChange", onStateChange);
        return;
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(clearHoldPause);
      if (attachedPlayer && isYoutubePlayerAttached(attachedPlayer)) {
        try {
          attachedPlayer.removeEventListener("onStateChange", onStateChange);
        } catch {
          /* ignore */
        }
      }
    };
  }, [ready, parked, videoId, playerGeneration, onPlayerApiReady]);

  useEffect(() => {
    if (!ready) return;

    const captureResumeSeconds = () => {
      let seconds = lastRecordedSecondsRef.current;
      const player = ytPlayerRef.current;
      if (isYoutubePlayerAttached(player)) {
        const t = readPlayerCurrentTime(player);
        if (t != null && t > 0) seconds = Math.floor(t);
      }
      if (seconds > 0) {
        lastRecordedSecondsRef.current = seconds;
        resumeSecondsRef.current = seconds;
        setResumeSeconds(seconds);
      }
    };

    const parkPlayer = () => {
      if (parkedRef.current) return;
      if (isDocumentPictureInPictureActive()) return;
      captureResumeSeconds();
      void recordProgressRef.current({ force: true, syncCloud: true });
      releasePlayer();
      parkedRef.current = true;
      setParked(true);
    };

    const unparkPlayer = () => {
      if (!parkedRef.current) return;
      const captured = resumeSecondsRef.current;
      if (captured != null && captured > 0) {
        setResumeSeconds(captured);
      }
      parkedRef.current = false;
      setParked(false);
      // pagehide may have destroyed the player before React committed parked
      // (bfcache freeze). The activated element is then a dead iframe.
      if (isLiteYoutubeElementActivated(shellRef.current)) {
        setPlayerGeneration((g) => g + 1);
      }
    };

    let parkTimer: number | null = null;
    const cancelPark = () => {
      if (parkTimer == null) return;
      window.clearTimeout(parkTimer);
      parkTimer = null;
    };
    const schedulePark = () => {
      cancelPark();
      parkTimer = window.setTimeout(() => {
        parkTimer = null;
        parkPlayer();
      }, PARK_AFTER_HIDDEN_MS);
    };

    const recoverPlayer = () => {
      captureResumeSeconds();
      ytPlayerRef.current = null;
      playerApiReadyRef.current = false;
      onPlayerApiReady?.(false);
      playingRef.current = false;
      setPlayerGeneration((g) => g + 1);
    };

    const onVisible = () => {
      cancelPark();
      if (parkedRef.current) {
        unparkPlayer();
        return;
      }
      if (playerApiReadyRef.current) return;
      // Fresh poster / remount in progress — the attach effect owns activation.
      if (!isLiteYoutubeElementActivated(shellRef.current)) return;
      recoverPlayer();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        schedulePark();
        return;
      }
      onVisible();
    };

    const onPageHide = () => {
      cancelPark();
      parkPlayer();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      cancelPark();
      if (event.persisted) {
        if (parkedRef.current) {
          unparkPlayer();
          return;
        }
        recoverPlayer();
        return;
      }
      onVisible();
    };

    const onResume = () => {
      cancelPark();
      if (parkedRef.current) {
        unparkPlayer();
        return;
      }
      if (!playerApiReadyRef.current) recoverPlayer();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    if ("onresume" in document) {
      document.addEventListener("resume", onResume);
    }
    if ("onfreeze" in document) {
      document.addEventListener("freeze", onPageHide);
    }

    return () => {
      cancelPark();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      if ("onresume" in document) {
        document.removeEventListener("resume", onResume);
      }
      if ("onfreeze" in document) {
        document.removeEventListener("freeze", onPageHide);
      }
    };
  }, [ready, videoId, onPlayerApiReady, releasePlayer]);

  useEffect(() => {
    if (!ready || !canPersistLibrary || parked) return;

    const sampleInterval = window.setInterval(() => {
      if (playingRef.current && playerApiReadyRef.current) {
        void recordProgressRef.current();
      }
    }, PROGRESS_SAMPLE_INTERVAL_MS);

    const persistInterval = window.setInterval(() => {
      if (!playingRef.current || !playerApiReadyRef.current) return;
      void recordProgressRef.current({ syncCloud: true });
    }, SIGNED_IN_CLOUD_SYNC_INTERVAL_MS);

    const flush = () => {
      if (!playerApiReadyRef.current) return;
      void recordProgressRef.current({
        force: true,
        syncCloud: true,
      });
    };

    const flushIfHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    const enforcePauseIfUserPaused = () => {
      if (document.visibilityState !== "visible" || !userPausedRef.current) {
        return;
      }
      const player = ytPlayerRef.current;
      if (!isYoutubePlayerAttached(player)) return;
      try {
        if (player!.getPlayerState() === YT.PlayerState.PLAYING) {
          player!.pauseVideo();
        }
      } catch {
        /* not ready */
      }
    };

    const onVisibilityChange = () => {
      flushIfHidden();
      enforcePauseIfUserPaused();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if ("onfreeze" in document) {
      document.addEventListener("freeze", flush);
    }

    return () => {
      window.clearInterval(sampleInterval);
      window.clearInterval(persistInterval);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if ("onfreeze" in document) {
        document.removeEventListener("freeze", flush);
      }
      flush();
    };
  }, [canPersistLibrary, ready, parked]);

  const shellSx = theatreMaximize
    ? {
        width: "100%",
        maxWidth: `min(100%, calc((100dvh - ${THEATRE_VIEWPORT_RESERVE}) * 16 / 9))`,
        maxHeight: `calc(100dvh - ${THEATRE_VIEWPORT_RESERVE})`,
        aspectRatio: "16 / 9",
        "@media (min-aspect-ratio: 1/1)": {
          maxWidth: "100%",
          maxHeight: "none",
        },
        "& lite-youtube": { borderRadius: 1, overflow: "hidden" },
      }
    : {
        width: "100%",
        "& lite-youtube": {
          borderRadius: 1,
          overflow: "hidden",
          [MOBILE_PORTRAIT]: { borderRadius: 0 },
        },
      };

  if (!ready) {
    const skeleton = (
      <Box
        sx={{
          ...shellSx,
          aspectRatio: "16 / 9",
          borderRadius: 1,
          bgcolor: "action.hover",
          [MOBILE_PORTRAIT]: { borderRadius: 0 },
        }}
      />
    );
    return theatreMaximize ? (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {skeleton}
      </Box>
    ) : (
      skeleton
    );
  }

  const player = (
    <Box ref={assignShellRef} sx={shellSx}>
      {parked ? (
        <Box
          aria-hidden
          sx={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 1,
            bgcolor: "action.hover",
            backgroundImage: thumbnailUrl
              ? `url("${thumbnailUrl}")`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            [MOBILE_PORTRAIT]: { borderRadius: 0 },
          }}
        />
      ) : (
        <lite-youtube
          key={`${videoId}-${playerGeneration}`}
          videoid={videoId}
          title={title ?? ""}
          params={params.toString()}
          {...{ "js-api": "" }}
          style={{
            width: "100%",
            maxWidth: "100%",
            display: "block",
          }}
        />
      )}
    </Box>
  );

  return theatreMaximize ? (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {player}
    </Box>
  ) : (
    player
  );
}
