"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";

import { useWatchCommentsVisible, useWatchUpNextVisible } from "@/app/providers";
import { GoToChannelButton } from "@/components/GoToChannelButton";
import { LiteYouTubeEmbed } from "@/components/LiteYouTubeEmbed";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { WatchLaterAddButton } from "@/components/WatchLaterAddButton";
import { WatchComments } from "@/components/WatchComments";
import { WatchDescription } from "@/components/WatchDescription";
import { WatchNextSidebar } from "@/components/WatchNextSidebar";
import type { VideoSummary } from "@/components/VideoSummary";
import { readFetchJson } from "@/lib/fetchJson";
import type { WatchVideoComments, WatchVideoDetails } from "@/lib/youtubeTypes";

type WatchNextApiResponse = {
  videos?: VideoSummary[];
  error?: string;
};

export type WatchExperienceClientProps = {
  videoId: string;
  title: string;
  thumb: string;
  startSeconds: number;
  video: WatchVideoDetails;
  channelPageHref: string | null;
  /**
   * When the comments cookie was on at SSR time, the server-fetched payload (or null on failure).
   * When the cookie was off, pass null; the client fetches after the user turns comments on.
   */
  commentsInitial: WatchVideoComments | null;
  /**
   * When the Up next cookie was on at SSR time, server-fetched related list; otherwise [].
   */
  watchNextInitial: VideoSummary[];
};

export function WatchExperienceClient({
  videoId,
  title,
  thumb,
  startSeconds,
  video,
  channelPageHref,
  commentsInitial,
  watchNextInitial,
}: WatchExperienceClientProps) {
  const { visible: upNextVisible } = useWatchUpNextVisible();
  const { visible: commentsVisible } = useWatchCommentsVisible();

  const [watchNextVideos, setWatchNextVideos] =
    useState<VideoSummary[]>(watchNextInitial);
  const watchNextFetchAttemptedRef = useRef(false);

  const fetchWatchNext = useCallback(async () => {
    const response = await fetch(
      `/api/videos/${encodeURIComponent(videoId)}/watch-next`,
    );
    const payload = await readFetchJson<WatchNextApiResponse>(response);
    if (!response.ok || !payload.videos) {
      throw new Error(payload.error || "Could not load related videos.");
    }
    setWatchNextVideos(payload.videos);
  }, [videoId]);

  useEffect(() => {
    if (!upNextVisible) {
      watchNextFetchAttemptedRef.current = false;
      return;
    }
    if (watchNextVideos.length > 0) return;
    if (watchNextFetchAttemptedRef.current) return;
    watchNextFetchAttemptedRef.current = true;
    const id = requestAnimationFrame(() => {
      void fetchWatchNext().catch(() => {
        /* sidebar stays empty */
      });
    });
    return () => cancelAnimationFrame(id);
  }, [upNextVisible, watchNextVideos.length, fetchWatchNext]);

  const metaParts = [
    video.channelName,
    video.uploadedAt,
    video.views > 0 ? `${video.views.toLocaleString()} views` : null,
  ].filter(Boolean);

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{
        pt: { xs: 0, sm: 2 },
        px: { xs: 0, sm: 3 },
      }}
    >
      <Grid
        container
        spacing={3}
        sx={{ px: { xs: 2, sm: 0 }, alignItems: "flex-start" }}
      >
        <Grid size={{ xs: 12, lg: upNextVisible ? 8 : 12 }}>
          <Stack spacing={1.5}>
            <Box
              sx={{
                mb: { xs: 2, sm: 3 },
              }}
            >
              <LiteYouTubeEmbed
                videoId={videoId}
                title={title}
                thumbnailUrl={thumb}
                channelName={video.channelName}
                startSeconds={startSeconds}
              />
            </Box>

            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {metaParts.join(" · ")}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {channelPageHref ? (
                <GoToChannelButton href={channelPageHref} />
              ) : null}
              <SaveChannelButton
                channelName={video.channelName}
                channelId={video.channelId}
                channelUrl={video.channelUrl}
                thumbnailUrl={video.channelThumbnailUrl ?? thumb}
              />
              <WatchLaterAddButton
                videoId={videoId}
                title={title}
                thumbnailUrl={thumb}
                channelName={video.channelName}
                startSecondsContext={startSeconds}
              />
            </Stack>
            {video.description?.trim() ? (
              <WatchDescription description={video.description} />
            ) : null}
            {commentsVisible ? (
              <WatchComments
                videoId={videoId}
                initialComments={commentsInitial}
                fetchInitialIfNeeded={commentsInitial === null}
              />
            ) : null}
          </Stack>
        </Grid>
        {upNextVisible ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            <WatchNextSidebar videos={watchNextVideos} />
          </Grid>
        ) : null}
      </Grid>
    </Container>
  );
}
