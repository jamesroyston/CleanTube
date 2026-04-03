"use client";

import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Button from "@mui/material/Button";

import { useWatchLater } from "@/context/WatchLaterContext";

type WatchLaterAddButtonProps = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  /** If set (e.g. from ?t=), saved with the entry for queue playback. */
  startSecondsContext?: number;
};

export function WatchLaterAddButton({
  videoId,
  title,
  thumbnailUrl,
  channelName,
  startSecondsContext,
}: WatchLaterAddButtonProps) {
  const { addOrUpdateEntry, isInWatchLater } = useWatchLater();
  const saved = isInWatchLater(videoId);

  if (saved) {
    return (
      <Button size="small" variant="outlined" disabled sx={{ alignSelf: "flex-start" }}>
        In Watch Later
      </Button>
    );
  }

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<WatchLaterOutlinedIcon />}
      onClick={() =>
        addOrUpdateEntry({
          videoId,
          title,
          thumbnailUrl,
          channelName,
          startSeconds:
            startSecondsContext != null && startSecondsContext > 0
              ? startSecondsContext
              : undefined,
        })
      }
      sx={{ alignSelf: "flex-start" }}
    >
      Watch later
    </Button>
  );
}
