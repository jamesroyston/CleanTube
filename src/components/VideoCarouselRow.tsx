"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import type { VideoSummary } from "@/components/VideoSummary";
import { VideoCard } from "@/components/VideoResultsGrid";

const CARD_WIDTH = { xs: 280, sm: 300 };

type VideoCarouselRowProps = {
  videos: VideoSummary[];
  /** Accessible name for the scroll region (e.g. section title). */
  ariaLabel?: string;
};

/**
 * Horizontal strip for For You subsections. Uses native touch scrolling (swipe)
 * with pan-x/pan-y so vertical page scroll works when a touch starts on a card.
 */
export function VideoCarouselRow({ videos, ariaLabel }: VideoCarouselRowProps) {
  if (videos.length === 0) return null;

  return (
    <Box
      role="region"
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        gap: 2.5,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
        scrollSnapType: "x mandatory",
        touchAction: "pan-x pan-y",
        pb: 0.5,
        mx: { xs: -2, sm: 0 },
        px: { xs: 2, sm: 0 },
        scrollPaddingInline: { xs: 16, sm: 0 },
      }}
    >
      {videos.map((video) => (
        <Box
          key={video.id}
          sx={{
            flex: "0 0 auto",
            width: CARD_WIDTH,
            scrollSnapAlign: "start",
            touchAction: "pan-x pan-y",
          }}
        >
          <VideoCard video={video} carousel />
        </Box>
      ))}
    </Box>
  );
}

/** Matches {@link VideoCard} layout: 16:9 thumb + title/channel lines. */
export function VideoCarouselCardSkeleton() {
  return (
    <Box
      sx={{
        flex: "0 0 auto",
        width: CARD_WIDTH,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
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

export function VideoCarouselRowSkeleton({ cardCount = 4 }: { cardCount?: number }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2.5,
        overflowX: "hidden",
        mx: { xs: -2, sm: 0 },
        px: { xs: 2, sm: 0 },
      }}
    >
      {Array.from({ length: cardCount }, (_, i) => (
        <VideoCarouselCardSkeleton key={i} />
      ))}
    </Box>
  );
}
