"use client";

import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { VideoCarouselRowSkeleton } from "@/components/VideoCarouselRow";

const FOR_YOU_SKELETON_SECTION_COUNT = 3;

function FeedSectionsSkeleton({
  sectionCount = FOR_YOU_SKELETON_SECTION_COUNT,
}: {
  sectionCount?: number;
}) {
  return (
    <Stack spacing={4}>
      {Array.from({ length: sectionCount }, (_, sectionIndex) => (
        <Box key={sectionIndex}>
          <Skeleton
            variant="text"
            height={32}
            sx={{ mb: 2, width: { xs: 180, sm: 220 } }}
          />
          <VideoCarouselRowSkeleton cardCount={4} />
        </Box>
      ))}
    </Stack>
  );
}

/** Sync Suspense fallback for home — avoids async server work in the fallback tree. */
export function ForYouPageFallback() {
  return (
    <>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <DynamicFeedOutlinedIcon color="primary" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            For You
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Recommendations from your saved channels, watch history, and pinned
          searches.
        </Typography>
      </Stack>
      <FeedSectionsSkeleton />
    </>
  );
}
