"use client";

import Box from "@mui/material/Box";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useGlobalYoutubeShortcuts } from "@/hooks/useGlobalYoutubeShortcuts";
import type { LiteYoutubeElement } from "@/types/lite-youtube-element";

import "lite-youtube-embed/src/lite-yt-embed.css";

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
   * When true (default), j/k/l, space, m, and c call the IFrame Player API
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
  const { upsertWatchProgress } = useCloudLibrary();
  const [ready, setReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastPersistedSecondsRef = useRef(-1);

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
        const currentSeconds = Math.max(
          0,
          Math.floor(player.getCurrentTime?.() ?? 0),
        );
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

    const interval = window.setInterval(() => {
      void persistProgress();
    }, 15000);

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
        }}
      />
    );
  }

  return (
    <Box ref={shellRef} sx={{ width: "100%" }}>
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
