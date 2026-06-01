"use client";

import ReplayIcon from "@mui/icons-material/Replay";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import type { ReactNode } from "react";

import { WatchProgressBar } from "@/components/WatchProgressBar";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { isRewatching } from "@/lib/cloudLibrary/sync";

type VideoCardThumbnailWithProgressProps = {
  videoId: string;
  children: ReactNode;
};

export function useVideoWatchHref(
  videoId: string,
  kind: "video" | "short" = "video",
): string {
  const { getResumeSeconds } = useCloudLibrary();
  const resume = getResumeSeconds(videoId);
  const basePath = kind === "short" ? `/shorts/${videoId}` : `/watch/${videoId}`;
  return resume && resume > 0
    ? `${basePath}?t=${encodeURIComponent(String(resume))}`
    : basePath;
}

export function VideoCardThumbnailWithProgress({
  videoId,
  children,
}: VideoCardThumbnailWithProgressProps) {
  const { getProgressByVideoId } = useCloudLibrary();
  const progress = getProgressByVideoId(videoId);
  const completed = progress?.completed === true;
  const positionSeconds = progress?.lastPositionSeconds ?? 0;
  const durationSeconds = progress?.durationSeconds;
  const hasProgress =
    progress != null && (completed || positionSeconds > 0);
  const rewatching = isRewatching(progress);

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      {children}
      {rewatching ? (
        <Chip
          icon={<ReplayIcon sx={{ fontSize: "0.75rem !important" }} />}
          label="Rewatching"
          size="small"
          aria-label="Rewatching"
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 3,
            height: 20,
            fontSize: "0.65rem",
            fontWeight: 600,
            pointerEvents: "none",
            bgcolor: "rgba(0,0,0,0.72)",
            color: "#fff",
            "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
            "& .MuiChip-label": { px: 0.75 },
          }}
        />
      ) : null}
      {completed ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.35)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      ) : null}
      {hasProgress ? (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <WatchProgressBar
            variant="overlay"
            positionSeconds={positionSeconds}
            durationSeconds={durationSeconds}
            forceFull={completed}
          />
        </Box>
      ) : null}
    </Box>
  );
}
