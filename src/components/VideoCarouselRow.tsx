"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

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
 * with pan-x so vertical page scroll still works on mobile browsers.
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
        touchAction: "pan-x",
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
          }}
        >
          <VideoCard video={video} />
        </Box>
      ))}
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
        <Skeleton
          key={i}
          variant="rounded"
          sx={{
            flex: "0 0 auto",
            width: CARD_WIDTH,
            aspectRatio: "16 / 9",
          }}
        />
      ))}
    </Box>
  );
}
