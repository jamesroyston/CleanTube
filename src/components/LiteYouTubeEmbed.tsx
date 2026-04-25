"use client";

import Box from "@mui/material/Box";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useGlobalYoutubeShortcuts } from "@/hooks/useGlobalYoutubeShortcuts";
import type { LiteYoutubeElement } from "@/types/lite-youtube-element";

import "lite-youtube-embed/src/lite-yt-embed.css";

const PROGRESS_SAMPLE_INTERVAL_MS = 1_000;
const ANONYMOUS_LOCAL_PERSIST_INTERVAL_MS = 10_000;
const SIGNED_IN_CLOUD_SYNC_INTERVAL_MS = 15_000;

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
};

export function LiteYouTubeEmbed({
  videoId,
  title,
  thumbnailUrl,
  channelName,
  startSeconds,
  enableGlobalShortcuts = true,
}: LiteYouTubeEmbedProps) {
  const { upsertWatchProgress, user } = useCloudLibrary();
  const [ready, setReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastRecordedSecondsRef = useRef(-1);
  const playingRef = useRef(false);

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

  const recordProgress = useCallback(
    async ({
      force = false,
      persistLocal = false,
      syncCloud = false,
    }: {
      force?: boolean;
      persistLocal?: boolean;
      syncCloud?: boolean;
    } = {}) => {
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
        const lastGood = lastRecordedSecondsRef.current;
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

        const writesOut = persistLocal || syncCloud;
        if (
          !force &&
          !writesOut &&
          Math.abs(currentSeconds - lastRecordedSecondsRef.current) < 1
        ) {
          return;
        }

        lastRecordedSecondsRef.current = currentSeconds;
        await upsertWatchProgress(
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
          {
            persistLocal,
            syncCloud,
          },
        );
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
      playingRef.current = state === YT.PlayerState.PLAYING;
      if (state === YT.PlayerState.PLAYING) {
        void recordProgress();
        return;
      }
      if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
        void recordProgress({ force: true, persistLocal: true, syncCloud: true });
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
  }, [recordProgress, ready, startSeconds, videoId]);

  useEffect(() => {
    if (!ready) return;

    const sampleInterval = window.setInterval(() => {
      if (playingRef.current) void recordProgress();
    }, PROGRESS_SAMPLE_INTERVAL_MS);

    const persistInterval = window.setInterval(
      () => {
        if (!playingRef.current) return;
        void recordProgress(
          user
            ? { syncCloud: true }
            : { persistLocal: true },
        );
      },
      user
        ? SIGNED_IN_CLOUD_SYNC_INTERVAL_MS
        : ANONYMOUS_LOCAL_PERSIST_INTERVAL_MS,
    );

    const flush = () => {
      void recordProgress({ force: true, persistLocal: true, syncCloud: true });
    };

    const flushIfHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushIfHidden);

    return () => {
      window.clearInterval(sampleInterval);
      window.clearInterval(persistInterval);
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushIfHidden);
      void recordProgress({ force: true, persistLocal: true, syncCloud: true });
    };
  }, [recordProgress, ready, user]);

  if (!ready) {
    return (
      <Box
        sx={{
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 1,
          bgcolor: "action.hover",
        }}
      />
    );
  }

  return (
    <Box
      ref={shellRef}
      sx={{
        width: "100%",
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
