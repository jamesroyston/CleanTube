"use client";

import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { VideoCard } from "@/components/VideoResultsGrid";
import type { VideoSummary } from "@/components/VideoSummary";
import { channelPageHrefFromToken } from "@/lib/youtubeUrl";
import type { ChannelSearchResult } from "@/lib/youtubeTypes";

type SearchResultsGridProps = {
  channels: ChannelSearchResult[];
  videos: VideoSummary[];
};

function ChannelCard({ channel }: { channel: ChannelSearchResult }) {
  const meta = [channel.handle, channel.subscriberText, channel.videoCountText]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
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
      <CardActionArea
        component={Link}
        href={channelPageHrefFromToken(channel.id)}
        sx={{ height: "100%", alignItems: "stretch" }}
      >
        <CardContent>
          <Stack spacing={1.5} alignItems="flex-start">
            <Chip
              icon={<SubscriptionsIcon />}
              label="Channel"
              size="small"
              color="primary"
              variant="outlined"
            />
            <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
              <Avatar
                src={channel.thumbnailUrl}
                alt=""
                sx={{ width: 56, height: 56, bgcolor: "primary.main" }}
              >
                {channel.title.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  component="h2"
                  sx={{ fontWeight: 700 }}
                  noWrap
                >
                  {channel.title}
                </Typography>
                {meta ? (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {meta}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
            {channel.description ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                }}
              >
                {channel.description}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function SearchResultsGrid({
  channels,
  videos,
}: SearchResultsGridProps) {
  return (
    <Grid container spacing={2.5}>
      {channels.map((channel) => (
        <Grid key={`channel:${channel.id}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <ChannelCard channel={channel} />
        </Grid>
      ))}
      {videos.map((video) => (
        <Grid key={`video:${video.id}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <VideoCard video={video} />
        </Grid>
      ))}
    </Grid>
  );
}
