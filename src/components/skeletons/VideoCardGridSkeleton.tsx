"use client";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function VideoCardSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
        height: "100%",
      }}
    >
      <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio: "16 / 9" }} />
      <Stack spacing={0.75} sx={{ p: 1.5 }}>
        <Skeleton variant="text" width="95%" height={22} />
        <Skeleton variant="text" width="70%" height={18} />
        <Skeleton variant="text" width="45%" height={16} />
      </Stack>
    </Box>
  );
}

export function ChannelCardSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
        height: "100%",
        p: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" width={88} height={24} />
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Skeleton variant="circular" width={56} height={56} />
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="85%" height={24} />
            <Skeleton variant="text" width="60%" height={18} />
          </Stack>
        </Stack>
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="75%" />
      </Stack>
    </Box>
  );
}

type VideoCardGridSkeletonProps = {
  count?: number;
  /** Mix channel-style cards into the first slots (search results). */
  channelCount?: number;
};

export function VideoCardGridSkeleton({
  count = 8,
  channelCount = 0,
}: VideoCardGridSkeletonProps) {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: count }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          {index < channelCount ? <ChannelCardSkeleton /> : <VideoCardSkeleton />}
        </Grid>
      ))}
    </Grid>
  );
}
