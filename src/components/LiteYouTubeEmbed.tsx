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
  resyncPlayerSize,
} from "@/lib/youtubePlayerControls";
import {
  ensureYoutubeIframeAllowsPiP,
  getAttachedLiteYoutubePlayer,
  isLiteYoutubeElementActivated,
  isYoutubePlayerAttached,
  readPlayerCurrentTime,
  readPlayerDuration,
  releaseLiteYoutubePlayer,
  stopLiteYoutubePlayer,
} from "@/lib/youtubePlayer";
import { registerWatchPlayerStop } from "@/lib/watchPlayerLifecycle";
import {
  MOBILE_LANDSCAPE,
  MOBILE_LANDSCAPE_QUERY,
} from "@/lib/mobileLandscape";
import { MOBILE_PORTRAIT } from "@/lib/watchLayoutSx";

import "lite-youtube-embed/src/lite-yt-embed.css";

const PROGRESS_SAMPLE_INTERVAL_MS = 1_000;
/** Default 15s; see docs/decisions/watch-progress-persistence.md (Hobby may use 30s). */
const SIGNED_IN_CLOUD_SYNC_INTERVAL_MS = 15_000;
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

/**
 * Landscape: fill the shell. JS pins the iframe to that pixel size.
 */
const LANDSCAPE_FIT_SX = {
  height: "100%",
  width: "100%",
  maxWidth: "100%",
  maxHeight: "100%",
  overflow: "hidden",
  transform: "translate3d(0, 0, 0)",
} as const;

/** Give up on a hung `getYTPlayer()` (iOS after background) and remount. */
const ATTACH_PLAYER_TIMEOUT_MS = 4_000;
const ATTACH_REMOUNT_LIMIT = 2;

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
  const [resumeSeconds, setResumeSeconds] = useState<number | undefined>(
    undefined,
  );
  const resumeSecondsRef = useRef<number | undefined>(undefined);
  const attachFailRef = useRef(0);
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
    attachFailRef.current = 0;
    setResumeSeconds(undefined);
  }, [videoId]);

  useGlobalYoutubeShortcuts(
    shellRef,
    videoId,
    enableGlobalShortcuts && ready,
    playerApiReadyRef,
  );

  /**
   * Fill the shell (island to rail). Same pixel size as the visible box so the
   * control bar stays on-screen — no overscan.
   */
  useEffect(() => {
    if (!ready) return;
    const box = shellRef.current;
    const container = box?.parentElement;
    if (!box || !container) return;

    const orientation = window.matchMedia(MOBILE_LANDSCAPE_QUERY);

    const clearFit = () => {
      box.style.removeProperty("width");
      box.style.removeProperty("height");
      box.style.removeProperty("margin-left");
      box.style.removeProperty("max-width");
      box.style.removeProperty("overflow");
      box.style.removeProperty("transform");
      const embed = box.querySelector("lite-youtube");
      if (embed instanceof HTMLElement) {
        embed.style.removeProperty("width");
        embed.style.removeProperty("height");
        embed.style.removeProperty("max-width");
        embed.style.removeProperty("margin-left");
        embed.style.removeProperty("margin-top");
        embed.style.removeProperty("overflow");
        embed.style.removeProperty("contain");
        embed.style.removeProperty("transform");
      }
      const iframe = box.querySelector("iframe");
      if (iframe instanceof HTMLIFrameElement) {
        iframe.removeAttribute("width");
        iframe.removeAttribute("height");
        iframe.style.removeProperty("width");
        iframe.style.removeProperty("height");
        iframe.style.removeProperty("margin-left");
        iframe.style.removeProperty("left");
        iframe.style.removeProperty("margin-top");
        iframe.style.removeProperty("top");
        iframe.style.removeProperty("transform");
      }
    };

    const applyFit = () => {
      if (!orientation.matches) {
        clearFit();
        return;
      }
      const style = getComputedStyle(container);
      const maxW =
        container.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const maxH =
        container.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      if (!(maxW > 0) || !(maxH > 0)) return;
      const holeW = Math.floor(maxW);
      const holeH = Math.floor(maxH);
      if (!(holeW > 0) || !(holeH > 0)) return;
      box.style.overflow = "hidden";
      box.style.maxWidth = "none";
      box.style.width = `${holeW}px`;
      box.style.height = `${holeH}px`;
      box.style.transform = "translate3d(0, 0, 0)";
      const embed = box.querySelector("lite-youtube");
      if (embed instanceof HTMLElement) {
        embed.style.contain = "none";
        embed.style.maxWidth = "none";
        embed.style.width = "100%";
        embed.style.height = "100%";
        embed.style.marginLeft = "0px";
        embed.style.marginTop = "0px";
        embed.style.transform = "translate3d(0, 0, 0)";
      }
      const iframe = box.querySelector("iframe");
      if (iframe instanceof HTMLIFrameElement) {
        iframe.setAttribute("width", String(holeW));
        iframe.setAttribute("height", String(holeH));
        iframe.style.width = `${holeW}px`;
        iframe.style.height = `${holeH}px`;
        iframe.style.left = "0px";
        iframe.style.marginLeft = "0px";
        iframe.style.top = "0px";
        iframe.style.marginTop = "0px";
        iframe.style.transform = "translate3d(0, 0, 0)";
      }
      resyncPlayerSize(ytPlayerRef.current, { width: holeW, height: holeH });
    };

    applyFit();
    const observer = new ResizeObserver(applyFit);
    observer.observe(container);
    const mutations = new MutationObserver(applyFit);
    mutations.observe(box, { childList: true, subtree: true });
    orientation.addEventListener("change", applyFit);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      orientation.removeEventListener("change", applyFit);
      clearFit();
    };
  }, [ready]);

  /** Rotation resizes the iframe in place; make the player re-measure itself. */
  useEffect(() => {
    if (!ready) return;

    let raf = 0;
    const timers: number[] = [];
    const resync = () => resyncPlayerSize(ytPlayerRef.current);
    const scheduleResync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(resync);
      /** iOS settles orientation over a few frames; re-apply once it has. */
      timers.push(window.setTimeout(resync, 300));
    };

    const orientation = window.matchMedia("(orientation: landscape)");
    window.addEventListener("resize", scheduleResync);
    window.addEventListener("orientationchange", scheduleResync);
    orientation.addEventListener("change", scheduleResync);

    return () => {
      cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
      window.removeEventListener("resize", scheduleResync);
      window.removeEventListener("orientationchange", scheduleResync);
      orientation.removeEventListener("change", scheduleResync);
    };
  }, [ready]);

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
    if (!ready) return;

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
      if (
        state === YT.PlayerState.PLAYING ||
        state === YT.PlayerState.BUFFERING
      ) {
        if (holdPause && state === YT.PlayerState.PLAYING) {
          try {
            player.pauseVideo();
          } catch {
            /* not ready */
          }
          playingRef.current = false;
          return;
        }
        if (state === YT.PlayerState.PLAYING) {
          userPausedRef.current = false;
          void recordProgressRef.current();
        }
        playingRef.current = true;
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
        const el = root.querySelector("lite-youtube");
        if (
          !el ||
          typeof (el as { getYTPlayer?: unknown }).getYTPlayer !== "function"
        ) {
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        const player = await getAttachedLiteYoutubePlayer(
          root,
          ATTACH_PLAYER_TIMEOUT_MS,
        );
        if (cancelled) return;
        if (!player) {
          if (attachFailRef.current >= ATTACH_REMOUNT_LIMIT) return;
          attachFailRef.current += 1;
          setPlayerGeneration((g) => g + 1);
          return;
        }
        attachedPlayer = player;
        ytPlayerRef.current = player;
        playerApiReadyRef.current = true;
        attachFailRef.current = 0;
        ensurePlayerVolume100(player);
        ensureYoutubeIframeAllowsPiP(player);
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
  }, [ready, videoId, playerGeneration, onPlayerApiReady]);

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

    const flush = () => {
      captureResumeSeconds();
      void recordProgressRef.current({ force: true, syncCloud: true });
    };

    const playerLooksAlive = () => {
      const player = ytPlayerRef.current;
      if (!isYoutubePlayerAttached(player)) return false;
      try {
        player.getPlayerState();
        return true;
      } catch {
        return false;
      }
    };

    const recoverIfDead = () => {
      if (playerLooksAlive()) return;
      if (
        !playerApiReadyRef.current &&
        !isLiteYoutubeElementActivated(shellRef.current)
      ) {
        return;
      }
      captureResumeSeconds();
      const captured = resumeSecondsRef.current;
      if (captured != null && captured > 0) {
        setResumeSeconds(captured);
      }
      ytPlayerRef.current = null;
      playerApiReadyRef.current = false;
      onPlayerApiReady?.(false);
      playingRef.current = false;
      attachFailRef.current = 0;
      setPlayerGeneration((g) => g + 1);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
        return;
      }
      recoverIfDead();
    };

    const onPageHide = () => {
      flush();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !playerLooksAlive()) {
        recoverIfDead();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", recoverIfDead);
    if ("onresume" in document) {
      document.addEventListener("resume", recoverIfDead);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", recoverIfDead);
      if ("onresume" in document) {
        document.removeEventListener("resume", recoverIfDead);
      }
    };
  }, [ready, videoId, onPlayerApiReady]);

  useEffect(() => {
    if (!ready || !canPersistLibrary) return;

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
  }, [canPersistLibrary, ready]);

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
          [MOBILE_LANDSCAPE]: { borderRadius: 0 },
        },
        [MOBILE_LANDSCAPE]: LANDSCAPE_FIT_SX,
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
          [MOBILE_LANDSCAPE]: { ...LANDSCAPE_FIT_SX, borderRadius: 0 },
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
