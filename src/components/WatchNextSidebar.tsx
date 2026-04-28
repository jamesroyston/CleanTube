import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import type { VideoSummary } from "@/components/VideoSummary";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";

type WatchNextSidebarProps = {
  videos: VideoSummary[];
};

function WatchNextCard({ video }: { video: VideoSummary }) {
  return (
    <Link
      href={`/watch/${video.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
          borderRadius: 1,
          p: 0.5,
          mx: -0.5,
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
        <YouTubeThumbnailImage
          src={video.thumbnailUrl}
          fallbacks={video.thumbnailFallbackUrls}
          alt=""
          fill
          sizes="112px"
          style={{ objectFit: "cover" }}
        />
        <Chip
          label={video.durationFormatted}
          size="small"
          color={video.live ? "error" : "default"}
          sx={{
            position: "absolute",
            bottom: 2,
            right: 2,
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
  );
}

/**
 * Right column: related videos from YouTube’s `watch_next_feed` (same rail as the official watch page).
 */
export function WatchNextSidebar({ videos }: WatchNextSidebarProps) {
  if (videos.length === 0) return null;

  return (
    <Stack
      spacing={1.25}
      sx={{
        position: { lg: "sticky" },
        top: { lg: 16 },
        alignSelf: "flex-start",
      }}
    >
      <Typography
        component="h2"
        variant="subtitle2"
        sx={{ fontWeight: 700, px: 0.5, letterSpacing: 0.02 }}
      >
        Up next
      </Typography>
      <Stack spacing={0.75}>
        {videos.map((video) => (
          <WatchNextCard key={video.id} video={video} />
        ))}
      </Stack>
    </Stack>
  );
}
