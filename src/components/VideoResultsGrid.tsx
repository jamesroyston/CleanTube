"use client";

import Grid from "@mui/material/Grid";

import { VideoCard } from "@/components/VideoCard";
import type { VideoSummary } from "@/components/VideoSummary";

export { VideoCard } from "@/components/VideoCard";

type VideoResultsGridProps = {
  videos: VideoSummary[];
};

export function VideoResultsGrid({ videos }: VideoResultsGridProps) {
  return (
    <Grid container spacing={2.5}>
      {videos.map((video) => (
        <Grid key={video.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <VideoCard video={video} />
        </Grid>
      ))}
    </Grid>
  );
}
