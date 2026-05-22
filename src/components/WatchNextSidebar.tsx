"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import type { VideoSummary } from "@/components/VideoSummary";
import {
  useVideoWatchHref,
  VideoCardThumbnailWithProgress,
} from "@/components/VideoCardThumbnailWithProgress";
import { WatchLaterCardButton } from "@/components/WatchLaterCardButton";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";

type WatchNextSidebarProps = {
  videos: VideoSummary[];
};

function WatchNextCard({ video }: { video: VideoSummary }) {
  const watchHref = useVideoWatchHref(video.id);

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 1,
        mx: -0.5,
      }}
    >
      <Link
        href={watchHref}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            p: 0.5,
            transition: "background-color 0.15s ease",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: 112,
              flexShrink: 0,
              aspectRatio: "16 / 9",
              borderRadius: 0.75,
              overflow: "hidden",
              bgcolor: "action.hover",
            }}
          >
            <VideoCardThumbnailWithProgress videoId={video.id}>
              <YouTubeThumbnailImage
                src={video.thumbnailUrl}
                fallbacks={video.thumbnailFallbackUrls}
                alt=""
                fill
                sizes="112px"
                style={{ objectFit: "cover" }}
              />
            </VideoCardThumbnailWithProgress>
            <Chip
              label={video.durationFormatted}
              size="small"
              color={video.live ? "error" : "default"}
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                zIndex: 3,
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 600,
                "& .MuiChip-label": { px: 0.5 },
                bgcolor: video.live ? undefined : "rgba(0,0,0,0.82)",
                color: video.live ? undefined : "#fff",
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {video.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {video.channelName}
              {video.uploadedAt ? ` · ${video.uploadedAt}` : ""}
            </Typography>
          </Box>
        </Box>
      </Link>
      <Box
        sx={{
          position: "absolute",
          top: 6,
          left: 6,
          zIndex: 4,
        }}
      >
        <WatchLaterCardButton video={video} />
      </Box>
    </Box>
  );
}

const WATCH_NEXT_SKELETON_COUNT = 3;

function WatchNextCardSkeleton() {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", p: 0.5 }}>
      <Skeleton
        variant="rounded"
        sx={{
          width: 112,
          flexShrink: 0,
          aspectRatio: "16 / 9",
          borderRadius: 0.75,
        }}
      />
      <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="72%" />
        <Skeleton variant="text" width="55%" sx={{ mt: 0.25 }} />
      </Box>
    </Box>
  );
}

/**
 * Right column: related videos from YouTube’s `watch_next_feed` (same rail as the official watch page).
 */
export function WatchNextSidebar({ videos }: WatchNextSidebarProps) {
  const loading = videos.length === 0;

  return (
    <Stack
      spacing={1.25}
      sx={{
        position: { lg: "sticky" },
        top: { lg: 16 },
        alignSelf: "flex-start",
        minHeight: loading ? 280 : undefined,
      }}
    >
      <Typography
        component="h2"
        variant="subtitle2"
        sx={{ fontWeight: 700, px: 0.5, letterSpacing: 0.02 }}
      >
        Up next
      </Typography>
      {loading ? (
        <Stack spacing={0.75} aria-busy aria-label="Loading related videos">
          {Array.from({ length: WATCH_NEXT_SKELETON_COUNT }, (_, i) => (
            <WatchNextCardSkeleton key={i} />
          ))}
        </Stack>
      ) : (
        <Stack spacing={0.75}>
          {videos.map((video) => (
            <WatchNextCard key={video.id} video={video} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
