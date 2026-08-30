"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  useWatchNarrowPlayerLayout,
  useWatchUpNextVisible,
} from "@/app/providers";
import { WatchExperienceClient } from "@/components/WatchExperienceClient";
import { preloadLiteYoutubeEmbed } from "@/components/LiteYouTubeEmbed";
import { WatchLaterBanner } from "@/components/WatchLaterBanner";
import { WatchNextCardSkeleton } from "@/components/WatchNextSidebar";
import { useWatchVideo } from "@/hooks/useWatchVideo";
import {
  watchBelowPlayerPadSx,
  watchPageGridSx,
  watchPlayerPlaceholderSx,
  watchPlayerShellSx,
  watchSidebarPadSx,
} from "@/lib/watchLayoutSx";
import { startSecondsFromWatchPageQuery } from "@/lib/youtubeTime";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
  isValidYoutubeChannelId,
} from "@/lib/youtubeUrl";

export type WatchPageClientProps = {
  videoId: string;
  /** User preference: load comments after video shell (no SSR block). */
  commentsEnabled: boolean;
  /** Server-fetched details so refresh can mount the player without waiting on `/api/videos`. */
  initialVideo?: WatchVideoDetails | null;
};

function channelHrefForWatchVideo(video: {
  channelId?: string;
  channelUrl?: string;
}): string | null {
  if (video.channelId && isValidYoutubeChannelId(video.channelId)) {
    return channelPageHrefFromToken(video.channelId);
  }
  const token = video.channelUrl
    ? extractChannelRouteTokenFromUrl(video.channelUrl)
    : null;
  return token ? channelPageHrefFromToken(token) : null;
}

function WatchPageSkeletonBody({
  reserveUpNextColumn,
  upNextVisible,
}: {
  reserveUpNextColumn: boolean;
  upNextVisible: boolean;
}) {
  return (
    <Grid container spacing={{ xs: 0, sm: 3 }} sx={watchPageGridSx}>
      <Grid size={{ xs: 12, lg: reserveUpNextColumn ? 8 : 12 }}>
        <Stack spacing={1.5}>
          <Box sx={watchPlayerShellSx}>
            <Skeleton
              variant="rectangular"
              animation="wave"
              sx={watchPlayerPlaceholderSx}
            />
          </Box>

          <Stack spacing={1.5} sx={watchBelowPlayerPadSx}>
            <Skeleton
              variant="text"
              width="72%"
              sx={{ fontSize: "1.125rem", fontWeight: 700 }}
            />
            <Skeleton variant="text" width="38%" sx={{ fontSize: "0.875rem" }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Skeleton variant="rounded" width={108} height={32} />
              <Skeleton variant="rounded" width={116} height={32} />
              <Skeleton variant="rounded" width={96} height={32} />
            </Stack>
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Stack spacing={0.75}>
                <Skeleton variant="text" width="100%" sx={{ fontSize: "0.875rem" }} />
                <Skeleton variant="text" width="96%" sx={{ fontSize: "0.875rem" }} />
                <Skeleton variant="text" width="88%" sx={{ fontSize: "0.875rem" }} />
              </Stack>
              <Skeleton
                variant="rounded"
                width={96}
                height={28}
                sx={{ mt: 1, borderRadius: 1 }}
              />
            </Box>
          </Stack>
        </Stack>
      </Grid>
      {reserveUpNextColumn && upNextVisible ? (
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={1.25} sx={{ minHeight: 280, ...watchSidebarPadSx }}>
            <Skeleton variant="text" width="40%" sx={{ fontSize: "1.25rem" }} />
            {Array.from({ length: 3 }, (_, i) => (
              <WatchNextCardSkeleton key={i} />
            ))}
          </Stack>
        </Grid>
      ) : reserveUpNextColumn ? (
        <Grid size={{ xs: 12, lg: 4 }} aria-hidden>
          <Box sx={{ minHeight: 0 }} />
        </Grid>
      ) : null}
    </Grid>
  );
}

export function WatchPageSkeleton({ videoId }: { videoId: string }) {
  const { visible: upNextVisible } = useWatchUpNextVisible();
  const { enabled: narrowPlayerLayout } = useWatchNarrowPlayerLayout();
  const reserveUpNextColumn = narrowPlayerLayout || upNextVisible;

  return (
    <Box component="main" sx={{ pb: { xs: 4, sm: 6 } }}>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ pt: { xs: 0, sm: 2 }, px: { xs: 0, sm: 3 } }}
      >
        <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1, sm: 0 } }}>
          <WatchLaterBanner videoId={videoId} />
        </Box>
      </Container>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ pt: { xs: 0, sm: 2 }, px: { xs: 0, sm: 3 } }}
      >
        <WatchPageSkeletonBody
          reserveUpNextColumn={reserveUpNextColumn}
          upNextVisible={upNextVisible}
        />
      </Container>
    </Box>
  );
}

export function WatchPageClient({
  videoId,
  commentsEnabled,
  initialVideo = null,
}: WatchPageClientProps) {
  const searchParams = useSearchParams();
  const { video, error, isInitialLoad, refresh } = useWatchVideo(
    videoId,
    initialVideo,
  );

  useEffect(() => {
    preloadLiteYoutubeEmbed();
  }, []);

  const startSeconds =
    startSecondsFromWatchPageQuery({
      t: searchParams.get("t") ?? undefined,
      start: searchParams.get("start") ?? undefined,
    }) ?? 0;

  if (isInitialLoad) {
    return <WatchPageSkeleton videoId={videoId} />;
  }

  if (!video) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Video not found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error ?? "This video could not be loaded."}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button variant="outlined" onClick={() => void refresh()}>
              Retry
            </Button>
            <Button component={Link} href="/" variant="contained">
              Back home
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }

  const title = video.title ?? "Video";
  const thumb =
    video.thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
  const channelPageHref = channelHrefForWatchVideo(video);

  return (
    <Box component="main" sx={{ pb: { xs: 4, sm: 6 } }}>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ pt: { xs: 0, sm: 2 }, px: { xs: 0, sm: 3 } }}
      >
        <Box
          className="watch-page-chrome"
          sx={{
            pt: { xs: 1, sm: 0 },
            pl: {
              xs: "max(16px, env(safe-area-inset-left, 0px))",
              sm: "env(safe-area-inset-left, 0px)",
            },
            pr: {
              xs: "max(16px, env(safe-area-inset-right, 0px))",
              sm: "env(safe-area-inset-right, 0px)",
            },
          }}
        >
          <WatchLaterBanner videoId={videoId} />
        </Box>
      </Container>

      <WatchExperienceClient
        key={videoId}
        videoId={videoId}
        title={title}
        thumb={thumb}
        startSeconds={startSeconds}
        video={video}
        channelPageHref={channelPageHref}
        commentsInitial={null}
        watchNextInitial={[]}
        commentsFetchOnMount={commentsEnabled}
      />
    </Box>
  );
}
