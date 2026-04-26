import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import type { VideoSummary } from "@/components/VideoSummary";
import { VideoCard } from "@/components/VideoResultsGrid";

type WatchNextSidebarProps = {
  videos: VideoSummary[];
};

/**
 * Right column: related videos from YouTube’s `watch_next_feed` (same rail as the official watch page).
 */
export function WatchNextSidebar({ videos }: WatchNextSidebarProps) {
  if (videos.length === 0) return null;

  return (
    <Stack
      spacing={2}
      sx={{
        position: { lg: "sticky" },
        top: { lg: 16 },
        alignSelf: "flex-start",
      }}
    >
      <Typography
        component="h2"
        variant="subtitle1"
        sx={{ fontWeight: 700, px: 0.5 }}
      >
        Up next
      </Typography>
      <Stack spacing={1.5}>
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </Stack>
    </Stack>
  );
}
