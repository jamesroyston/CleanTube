"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useWatchCommentsVisible,
  useWatchNarrowPlayerLayout,
  useWatchUpNextVisible,
} from "@/app/providers";
import { GoToChannelButton } from "@/components/GoToChannelButton";
import {
  LiteYouTubeEmbed,
  preloadLiteYoutubeEmbed,
} from "@/components/LiteYouTubeEmbed";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { WatchLaterAddButton } from "@/components/WatchLaterAddButton";
import { WatchComments } from "@/components/WatchComments";
import { WatchDescription } from "@/components/WatchDescription";
import { WatchNextSidebar } from "@/components/WatchNextSidebar";
import type { VideoSummary } from "@/components/VideoSummary";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { readFetchJson } from "@/lib/fetchJson";
import {
  parseYouTubeTimeParam,
} from "@/lib/youtubeTime";
import type { WatchVideoComments, WatchVideoDetails } from "@/lib/youtubeTypes";

type WatchNextApiResponse = {
  videos?: VideoSummary[];
  error?: string;
};

/** Phones in portrait: edge-to-edge video; text/sidebar keep horizontal inset. */
const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

const watchPlayerShellSx = {
  mb: { xs: 2, sm: 3 },
} as const;

const watchBelowPlayerPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
} as const;

const watchSidebarPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
} as const;

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
  const searchParams = useSearchParams();
  const {
    getResumeSeconds,
    authStatus,
    localLibraryHydrated,
    canPersistLibrary,
    libraryCloudSyncState,
  } = useCloudLibrary();
  const { visible: upNextVisible } = useWatchUpNextVisible();
  const { enabled: narrowPlayerLayout } = useWatchNarrowPlayerLayout();
  const { visible: commentsVisible } = useWatchCommentsVisible();

  const reserveUpNextColumn = narrowPlayerLayout || upNextVisible;

  const urlStartSeconds =
    parseYouTubeTimeParam(searchParams.get("t")) ??
    parseYouTubeTimeParam(searchParams.get("start"));
  const hasUrlStart = urlStartSeconds != null && urlStartSeconds > 0;

  const libraryReadyForPlayback =
    !canPersistLibrary ||
    libraryCloudSyncState === "synced" ||
    libraryCloudSyncState === "error";

  /** Mount player once auth (and cloud sync, when signed in) are ready. */
  const progressResolvable =
    localLibraryHydrated &&
    authStatus === "ready" &&
    libraryReadyForPlayback;

  const effectiveStartSeconds = useMemo(() => {
    if (hasUrlStart) return urlStartSeconds!;
    if (!progressResolvable) return startSeconds;
    if (canPersistLibrary) {
      const resume = getResumeSeconds(videoId);
      if (resume != null && resume > 0) return resume;
    }
    return startSeconds;
  }, [
    hasUrlStart,
    urlStartSeconds,
    progressResolvable,
    canPersistLibrary,
    videoId,
    getResumeSeconds,
    startSeconds,
  ]);

  /** Freeze start at first mount so saving progress on pause does not remount the player. */
  const playerMountRef = useRef<{
    videoId: string;
    startSeconds: number;
  } | null>(null);
  if (
    playerMountRef.current &&
    playerMountRef.current.videoId !== videoId
  ) {
    playerMountRef.current = null;
  }
  if (progressResolvable) {
    const prev = playerMountRef.current;
    if (!prev || prev.videoId !== videoId) {
      playerMountRef.current = {
        videoId,
        startSeconds: effectiveStartSeconds,
      };
    }
  }
  const showPlayer = playerMountRef.current?.videoId === videoId;
  const playerStartSeconds =
    playerMountRef.current?.startSeconds ?? effectiveStartSeconds;

  const [watchNextVideos, setWatchNextVideos] =
    useState<VideoSummary[]>(watchNextInitial);
  const watchNextFetchAttemptedRef = useRef(false);

  useEffect(() => {
    preloadLiteYoutubeEmbed();
  }, []);

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
        spacing={{ xs: 0, sm: 3 }}
        sx={{
          px: { xs: 2, sm: 0 },
          alignItems: "flex-start",
          [MOBILE_PORTRAIT]: { px: 0 },
        }}
      >
        <Grid size={{ xs: 12, lg: reserveUpNextColumn ? 8 : 12 }}>
          <Stack spacing={1.5}>
            <Box sx={watchPlayerShellSx}>
              {showPlayer ? (
                <LiteYouTubeEmbed
                  key={videoId}
                  videoId={videoId}
                  title={title}
                  thumbnailUrl={thumb}
                  channelName={video.channelName}
                  startSeconds={playerStartSeconds}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    borderRadius: 1,
                    bgcolor: "action.hover",
                    [MOBILE_PORTRAIT]: { borderRadius: 0 },
                  }}
                  aria-hidden
                />
              )}
            </Box>

            <Stack spacing={1.5} sx={watchBelowPlayerPadSx}>
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
                  startSecondsContext={effectiveStartSeconds}
                />
              </Stack>
              {video.description?.trim() ? (
                <WatchDescription description={video.description} />
              ) : null}
              <Box
                sx={{ display: commentsVisible ? "block" : "none" }}
                aria-hidden={!commentsVisible}
              >
                <WatchComments
                  videoId={videoId}
                  initialComments={commentsInitial}
                  fetchInitialIfNeeded={commentsInitial === null}
                  isVisible={commentsVisible}
                />
              </Box>
            </Stack>
          </Stack>
        </Grid>
        {reserveUpNextColumn ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            {upNextVisible ? (
              <Box sx={watchSidebarPadSx}>
                <WatchNextSidebar videos={watchNextVideos} />
              </Box>
            ) : (
              <Box aria-hidden sx={{ minHeight: 0 }} />
            )}
          </Grid>
        ) : null}
      </Grid>
    </Container>
  );
}
