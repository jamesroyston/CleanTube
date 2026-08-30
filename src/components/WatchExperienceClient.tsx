"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { WatchPlayerToolbar } from "@/components/WatchPlayerToolbar";
import { useShowBottomNav } from "@/hooks/useCompactViewport";

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
import { WatchShareButton } from "@/components/WatchShareButton";
import { WatchComments } from "@/components/WatchComments";
import { WatchDescription } from "@/components/WatchDescription";
import { WatchNextSidebar } from "@/components/WatchNextSidebar";
import type { VideoSummary } from "@/components/VideoSummary";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { readFetchJson } from "@/lib/fetchJson";
import { MOBILE_LANDSCAPE } from "@/lib/mobileLandscape";
import {
  watchBelowPlayerPadSx,
  watchPageGridSx,
  watchPlayerPlaceholderSx,
  watchPlayerShellSx,
  watchSidebarPadSx,
} from "@/lib/watchLayoutSx";
import {
  parseYouTubeTimeParam,
} from "@/lib/youtubeTime";
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
  /** Load comments once visible when the user keeps comments enabled in settings. */
  commentsFetchOnMount?: boolean;
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
  commentsFetchOnMount = false,
}: WatchExperienceClientProps) {
  const searchParams = useSearchParams();
  const {
    getResumeSeconds,
    authStatus,
    localLibraryHydrated,
    canPersistLibrary,
  } = useCloudLibrary();
  const { visible: upNextVisible } = useWatchUpNextVisible();
  const { enabled: narrowPlayerLayout } = useWatchNarrowPlayerLayout();
  const { visible: commentsVisible } = useWatchCommentsVisible();

  const reserveUpNextColumn = narrowPlayerLayout || upNextVisible;

  const urlStartSeconds =
    parseYouTubeTimeParam(searchParams.get("t")) ??
    parseYouTubeTimeParam(searchParams.get("start"));
  const hasUrlStart = urlStartSeconds != null && urlStartSeconds > 0;

  const libraryBootstrapComplete =
    localLibraryHydrated && authStatus === "ready";

  /**
   * Local library is enough to freeze resume for this device. Waiting on cloud
   * sync delayed the iframe on refresh; cross-device catch-up still happens on
   * the next visit once IndexedDB has the snapshot.
   */
  const canResolveResume = libraryBootstrapComplete;

  const effectiveStartSeconds = useMemo(() => {
    if (hasUrlStart) return urlStartSeconds!;
    if (!canResolveResume) return startSeconds;
    if (canPersistLibrary) {
      const resume = getResumeSeconds(videoId);
      if (resume != null && resume > 0) return resume;
    }
    return startSeconds;
  }, [
    hasUrlStart,
    urlStartSeconds,
    canResolveResume,
    canPersistLibrary,
    videoId,
    getResumeSeconds,
    startSeconds,
  ]);

  /** Freeze start at first player mount so progress saves do not remount the iframe. */
  const playerMountRef = useRef<{
    videoId: string;
    startSeconds: number;
  } | null>(null);
  const playerHasMountedRef = useRef(false);

  if (
    playerMountRef.current &&
    playerMountRef.current.videoId !== videoId
  ) {
    playerMountRef.current = null;
    playerHasMountedRef.current = false;
  }

  if (canResolveResume) {
    const prev = playerMountRef.current;
    if (!prev || prev.videoId !== videoId) {
      playerMountRef.current = {
        videoId,
        startSeconds: effectiveStartSeconds,
      };
    } else if (
      !playerHasMountedRef.current &&
      prev.startSeconds !== effectiveStartSeconds
    ) {
      playerMountRef.current = {
        videoId,
        startSeconds: effectiveStartSeconds,
      };
    }
  }

  const canMountPlayer =
    canResolveResume && playerMountRef.current?.videoId === videoId;

  if (canMountPlayer) {
    playerHasMountedRef.current = true;
  }

  const playerStartSeconds =
    playerMountRef.current?.startSeconds ?? effectiveStartSeconds;

  const [watchNextVideos, setWatchNextVideos] =
    useState<VideoSummary[]>(watchNextInitial);
  const watchNextFetchAttemptedRef = useRef(false);
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const [playerApiReady, setPlayerApiReady] = useState(false);
  const showBottomNav = useShowBottomNav();

  useEffect(() => {
    preloadLiteYoutubeEmbed();
  }, []);

  useEffect(() => {
    setPlayerApiReady(false);
  }, [videoId]);

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
      <Grid container spacing={{ xs: 0, sm: 3 }} sx={watchPageGridSx}>
        <Grid size={{ xs: 12, lg: reserveUpNextColumn ? 8 : 12 }}>
          <Stack spacing={1.5}>
            <Box sx={watchPlayerShellSx}>
              {canMountPlayer ? (
                <LiteYouTubeEmbed
                  key={videoId}
                  videoId={videoId}
                  title={title}
                  thumbnailUrl={thumb}
                  channelName={video.channelName}
                  startSeconds={playerStartSeconds}
                  playerShellRef={playerShellRef}
                  onPlayerApiReady={setPlayerApiReady}
                />
              ) : (
                <Box aria-hidden sx={watchPlayerPlaceholderSx} />
              )}
            </Box>

            {showBottomNav && canMountPlayer ? (
              /** Landscape uses the YouTube overlay controls inside the iframe. */
              <Box sx={{ [MOBILE_LANDSCAPE]: { display: "none" } }}>
                <WatchPlayerToolbar
                  videoId={videoId}
                  playerShellRef={playerShellRef}
                  playerApiReady={playerApiReady}
                />
              </Box>
            ) : null}

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
                <WatchShareButton
                  videoId={videoId}
                  playerShellRef={playerShellRef}
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
                  fetchInitialIfNeeded={
                    commentsFetchOnMount || commentsInitial === null
                  }
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
