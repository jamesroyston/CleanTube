"use client";

import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import type { VideoSummary } from "@/components/VideoSummary";
import { useWatchLater } from "@/context/WatchLaterContext";

type WatchLaterCardButtonProps = { video: VideoSummary };

export function WatchLaterCardButton({ video }: WatchLaterCardButtonProps) {
  const { addOrUpdateEntry, removeByVideoId, isInWatchLater } = useWatchLater();
  const saved = isInWatchLater(video.id);

  return (
    <Tooltip
      title={
        saved ? "Remove from Watch Later" : "Save to Watch Later"
      }
    >
      <IconButton
        type="button"
        size="small"
        aria-label={saved ? "Remove from Watch Later" : "Save to Watch Later"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (saved) removeByVideoId(video.id);
          else
            addOrUpdateEntry({
              videoId: video.id,
              title: video.title,
              thumbnailUrl: video.thumbnailUrl,
              channelName: video.channelName,
            });
        }}
        sx={{
          bgcolor: "rgba(0,0,0,0.65)",
          color: "#fff",
          "&:hover": { bgcolor: "rgba(0,0,0,0.82)" },
        }}
      >
        {saved ? (
          <PlaylistAddCheckIcon sx={{ fontSize: 20 }} />
        ) : (
          <WatchLaterOutlinedIcon sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
