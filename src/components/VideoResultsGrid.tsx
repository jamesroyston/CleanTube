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
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";

import type { VideoSummary } from "@/components/VideoSummary";
import { WatchLaterCardButton } from "@/components/WatchLaterCardButton";

type VideoResultsGridProps = {
  videos: VideoSummary[];
};

function VideoCard({ video }: { video: VideoSummary }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: (t) =>
            t.palette.mode === "dark"
              ? "0 8px 24px rgba(0,0,0,0.45)"
              : "0 8px 24px rgba(0,0,0,0.12)",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardActionArea
          component={Link}
          href={`/watch/${video.id}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            height: "100%",
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
              <Image
                src={video.thumbnailUrl}
                alt=""
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 480px"
                style={{ objectFit: "cover" }}
              />
            </CardMedia>
            <Chip
              label={video.durationFormatted}
              size="small"
              color={video.live ? "error" : "default"}
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                bgcolor: video.live ? undefined : "rgba(0,0,0,0.82)",
                color: video.live ? undefined : "#fff",
                "& .MuiChip-label": { px: 0.75 },
              }}
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
