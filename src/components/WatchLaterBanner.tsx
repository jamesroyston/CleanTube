"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

import { useWatchLater } from "@/context/WatchLaterContext";

export function WatchLaterBanner({ videoId }: { videoId: string }) {
  const { isInWatchLater, removeByVideoId } = useWatchLater();
  if (!isInWatchLater(videoId)) return null;

  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ mb: 2 }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => removeByVideoId(videoId)}
        >
          Remove from list
        </Button>
      }
    >
      This video is in your Watch Later queue.
    </Alert>
  );
}
