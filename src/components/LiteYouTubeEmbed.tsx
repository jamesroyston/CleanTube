"use client";

import Box from "@mui/material/Box";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useGlobalYoutubeShortcuts } from "@/hooks/useGlobalYoutubeShortcuts";
import type { LiteYoutubeElement } from "@/types/lite-youtube-element";

import "lite-youtube-embed/src/lite-yt-embed.css";

/** Background saves while playing. Play/pause/end also force-save; 5–15s is cheap (one small JSON write). */
const PROGRESS_POLL_INTERVAL_MS = 15_000;
const MOBILE_LANDSCAPE_QUERY = "(max-width:899px) and (orientation: landscape)";
const VISUAL_VIEWPORT_HEIGHT_VAR = "--ct-watch-visual-viewport-height";
const VISUAL_VIEWPORT_TOP_VAR = "--ct-watch-visual-viewport-top";

let liteYtLoad: Promise<unknown> | null = null;

function loadLiteYt() {
  if (!liteYtLoad) {
    liteYtLoad = import("lite-youtube-embed/src/lite-yt-embed.js");
  }
  return liteYtLoad;
}

type LiteYouTubeEmbedProps = {
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  channelName?: string;
  /** Iframe `start` in seconds (from `?t=` on the watch page). */
  startSeconds?: number;
  /**
   * When true (default), arrows, j/k/l, space, m, and c call the IFrame Player API
   * from document-level shortcuts (not only when the iframe is focused).
   */
  enableGlobalShortcuts?: boolean;
  fillMobileLandscape?: boolean;
};

export function LiteYouTubeEmbed({
  videoId,
  title,
  thumbnailUrl,
  channelName,
  startSeconds,
  enableGlobalShortcuts = true,
  fillMobileLandscape = false,
}: LiteYouTubeEmbedProps) {
  const { upsertWatchProgress } = useCloudLibrary();
  const [ready, setReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastPersistedSecondsRef = useRef(-1);

  useEffect(() => {
    if (!fillMobileLandscape || typeof window === "undefined") return;

    const media = window.matchMedia(MOBILE_LANDSCAPE_QUERY);

    function setViewportVars() {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;

      document.documentElement.style.setProperty(
        VISUAL_VIEWPORT_HEIGHT_VAR,
        `${Math.max(0, Math.floor(height))}px`,
      );
      document.documentElement.style.setProperty(
        VISUAL_VIEWPORT_TOP_VAR,
        `${Math.max(0, Math.floor(top))}px`,
      );
    }

    function updateViewportVars() {
      if (media.matches) {
        setViewportVars();
      } else {
        document.documentElement.style.removeProperty(VISUAL_VIEWPORT_HEIGHT_VAR);
        document.documentElement.style.removeProperty(VISUAL_VIEWPORT_TOP_VAR);
      }
    }

    updateViewportVars();
    window.visualViewport?.addEventListener("resize", updateViewportVars);
    window.visualViewport?.addEventListener("scroll", updateViewportVars);
    window.addEventListener("resize", updateViewportVars);
    window.addEventListener("orientationchange", updateViewportVars);
    media.addEventListener("change", updateViewportVars);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportVars);
      window.visualViewport?.removeEventListener("scroll", updateViewportVars);
      window.removeEventListener("resize", updateViewportVars);
      window.removeEventListener("orientationchange", updateViewportVars);
      media.removeEventListener("change", updateViewportVars);
      document.documentElement.style.removeProperty(VISUAL_VIEWPORT_HEIGHT_VAR);
      document.documentElement.style.removeProperty(VISUAL_VIEWPORT_TOP_VAR);
    };
  }, [fillMobileLandscape]);

  useEffect(() => {
    void loadLiteYt().then(() => setReady(true));
  }, []);

  useGlobalYoutubeShortcuts(
    shellRef,
    videoId,
    enableGlobalShortcuts && ready,
  );

  const start =
    startSeconds != null && Number.isFinite(startSeconds) && startSeconds > 0
      ? Math.floor(startSeconds)
      : undefined;

  const params = new URLSearchParams();
  params.set("enablejsapi", "1");
  if (start != null) params.set("start", String(start));

  const persistProgress = useCallback(
    async (force = false) => {
      const root = shellRef.current;
      if (!root) return;
      const el = root.querySelector("lite-youtube") as LiteYoutubeElement | null;
      if (!el || typeof el.getYTPlayer !== "function") return;

      try {
        const player = await el.getYTPlayer();
        let currentSeconds = Math.max(
          0,
          Math.floor(player.getCurrentTime?.() ?? 0),
        );
        const lastGood = lastPersistedSecondsRef.current;
        if (
          force &&
          currentSeconds === 0 &&
          lastGood > 0
        ) {
          currentSeconds = lastGood;
        }
        const durationSecondsRaw = player.getDuration?.();
        const durationSeconds =
          durationSecondsRaw && Number.isFinite(durationSecondsRaw)
            ? Math.floor(durationSecondsRaw)
            : undefined;
        const completed =
          durationSeconds != null &&
          durationSeconds > 0 &&
          durationSeconds - currentSeconds <= 30;

        if (!force && Math.abs(currentSeconds - lastPersistedSecondsRef.current) < 10) {
          return;
        }

        lastPersistedSecondsRef.current = currentSeconds;
        await upsertWatchProgress({
          videoId,
          title: title ?? "Video",
          thumbnailUrl:
            thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
          channelName: channelName ?? "Unknown channel",
          lastPositionSeconds: currentSeconds,
          durationSeconds,
          completed,
        });
      } catch {
        /* ignore player readiness issues */
      }
    },
    [channelName, thumbnailUrl, title, upsertWatchProgress, videoId],
  );

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let attachedPlayer: YT.Player | null = null;

    const onStateChange = (event: YT.OnStateChangeEvent) => {
      const state = event.data;
      if (
        state === YT.PlayerState.PLAYING ||
        state === YT.PlayerState.PAUSED ||
        state === YT.PlayerState.ENDED
      ) {
        void persistProgress(true);
      }
    };

    void (async () => {
      const root = shellRef.current;
      if (!root) return;
      for (let i = 0; i < 50 && !cancelled; i++) {
        const el = root.querySelector("lite-youtube") as LiteYoutubeElement | null;
        if (el && typeof el.getYTPlayer === "function") {
          try {
            const player = await el.getYTPlayer();
            if (cancelled) return;
            attachedPlayer = player;
            player.addEventListener("onStateChange", onStateChange);
            return;
          } catch {
            /* player not ready yet */
          }
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    })();

    return () => {
      cancelled = true;
      if (attachedPlayer) {
        try {
          attachedPlayer.removeEventListener("onStateChange", onStateChange);
        } catch {
          /* ignore */
        }
      }
    };
  }, [persistProgress, ready, startSeconds, videoId]);

  useEffect(() => {
    if (!ready) return;

    const interval = window.setInterval(() => {
      void persistProgress();
    }, PROGRESS_POLL_INTERVAL_MS);

    const flush = () => {
      void persistProgress(true);
    };

    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flush);
      void persistProgress(true);
    };
  }, [persistProgress, ready]);

  if (!ready) {
    return (
      <Box
        sx={{
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 1,
          bgcolor: "action.hover",
          ...(fillMobileLandscape
            ? {
                "@media (max-width:599px)": {
                  borderRadius: 0,
                },
                [MOBILE_LANDSCAPE_QUERY]: {
                  aspectRatio: "auto",
                  borderRadius: 0,
                  height: `var(${VISUAL_VIEWPORT_HEIGHT_VAR}, 100dvh)`,
                },
              }
            : {}),
        }}
      />
    );
  }

  return (
    <Box
      ref={shellRef}
      sx={{
        width: "100%",
        ...(fillMobileLandscape
          ? {
              "@media (max-width:599px)": {
                "& lite-youtube": {
                  borderRadius: "0 !important",
                },
              },
              [MOBILE_LANDSCAPE_QUERY]: {
                height: `var(${VISUAL_VIEWPORT_HEIGHT_VAR}, 100dvh)`,
                overflow: "hidden",
                bgcolor: "black",
                "& lite-youtube": {
                  aspectRatio: "auto",
                  borderRadius: "0 !important",
                  height: `var(${VISUAL_VIEWPORT_HEIGHT_VAR}, 100dvh)`,
                },
                "& lite-youtube iframe": {
                  height: "100%",
                  width: "100%",
                },
              },
            }
          : {}),
      }}
    >
      <lite-youtube
        key={`${videoId}-${start ?? 0}`}
        videoid={videoId}
        title={title ?? ""}
        params={params.toString()}
        // JSX cannot spell `js-api`; required for getYTPlayer() / IFrame API.
        {...{ "js-api": "" }}
        style={{
          width: "100%",
          maxWidth: "100%",
          display: "block",
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
    </Box>
  );
}
