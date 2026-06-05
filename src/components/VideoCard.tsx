"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";

import type { VideoSummary } from "@/components/VideoSummary";
import {
  useVideoWatchHref,
  VideoCardThumbnailWithProgress,
} from "@/components/VideoCardThumbnailWithProgress";
import { WatchLaterCardButton } from "@/components/WatchLaterCardButton";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";
import { watchNavigationCaptureHandlers } from "@/lib/watchReturnNavigation";
import { cardShadowDark, cardShadowLight } from "@/theme/theme";

export type VideoCardProps = {
  video: VideoSummary;
  /** In horizontal carousels: allow vertical page scroll when touch starts on card. */
  carousel?: boolean;
};

export function VideoCard({ video, carousel = false }: VideoCardProps) {
  const watchHref = useVideoWatchHref(video.id);

  return (
    <Card
      id={`search-video-${video.id}`}
      variant="outlined"
      sx={(theme) => ({
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...(carousel
          ? {
              touchAction: "pan-x pan-y",
              WebkitTapHighlightColor: "transparent",
            }
          : {}),
        /**
         * Guard hover behind a real pointer. On touch (iOS) `:hover` sticks after
         * the first tap, so the first tap only triggers hover and the second
         * actually navigates — gating it removes that double-tap feel.
         */
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": {
            transform: "translateY(-2px)",
            ...theme.applyStyles("dark", { boxShadow: cardShadowDark }),
            ...theme.applyStyles("light", { boxShadow: cardShadowLight }),
          },
        },
      })}
    >
      <Box sx={{ position: "relative" }}>
        <CardActionArea
          component={Link}
          href={watchHref}
          {...watchNavigationCaptureHandlers(video.id)}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            height: "100%",
            /** Removes the synthetic ~300ms tap delay so the first tap navigates. */
            touchAction: "manipulation",
            ...(carousel
              ? {
                  WebkitTapHighlightColor: "transparent",
                  "&:focus:not(:focus-visible)": {
                    backgroundColor: "transparent",
                  },
                }
              : {}),
          }}
        >
          <Box sx={{ position: "relative", width: "100%" }}>
            <CardMedia
              component="div"
              sx={{
                position: "relative",
                aspectRatio: "16 / 9",
                bgcolor: "action.hover",
              }}
            >
              <VideoCardThumbnailWithProgress videoId={video.id}>
                <YouTubeThumbnailImage
                  src={video.thumbnailUrl}
                  fallbacks={video.thumbnailFallbackUrls}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 480px"
                  style={{ objectFit: "cover" }}
                />
              </VideoCardThumbnailWithProgress>
            </CardMedia>
            <Chip
              label={video.durationFormatted}
              size="small"
              color={video.live ? "error" : "default"}
              sx={(theme) => ({
                position: "absolute",
                bottom: 8,
                right: 8,
                zIndex: 3,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                bgcolor: video.live
                  ? undefined
                  : alpha(theme.palette.overlay, 0.82),
                color: video.live ? undefined : theme.palette.common.white,
                "& .MuiChip-label": { px: 0.75 },
              })}
            />
          </Box>
          <CardContent sx={{ flexGrow: 1, pt: 1.5 }}>
            <Typography
              variant="subtitle1"
              component="h2"
              sx={{ fontWeight: 600, mb: 1, lineHeight: 1.35 }}
            >
              {video.title}
            </Typography>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {video.channelName}
                </Typography>
              </Stack>
              {video.uploadedAt ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CalendarTodayIcon
                    sx={{ fontSize: 14, color: "text.secondary" }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {video.uploadedAt}
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <AccessTimeIcon
                    sx={{ fontSize: 14, color: "text.secondary" }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    —
                  </Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </CardActionArea>
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
          }}
        >
          <WatchLaterCardButton video={video} />
        </Box>
      </Box>
    </Card>
  );
}
