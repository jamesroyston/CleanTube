"use client";

import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";

import { useGlobalYoutubeShortcuts } from "@/hooks/useGlobalYoutubeShortcuts";

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
  startSeconds,
  enableGlobalShortcuts = true,
}: LiteYouTubeEmbedProps) {
  const [ready, setReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

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
