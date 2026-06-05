"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  useWatchNarrowPlayerLayout,
  useWatchUpNextVisible,
} from "@/app/providers";
import { WatchExperienceClient } from "@/components/WatchExperienceClient";
import { WatchLaterBanner } from "@/components/WatchLaterBanner";
import { WatchNextCardSkeleton } from "@/components/WatchNextSidebar";
import { useShowBottomNav } from "@/hooks/useCompactViewport";
import { useWatchVideo } from "@/hooks/useWatchVideo";
import { startSecondsFromWatchPageQuery } from "@/lib/youtubeTime";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
  isValidYoutubeChannelId,
} from "@/lib/youtubeUrl";

export type WatchPageClientProps = {
  videoId: string;
  /** User preference: load comments after video shell (no SSR block). */
  commentsEnabled: boolean;
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

const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

function WatchPageSkeletonBody({
  reserveUpNextColumn,
  upNextVisible,
  showToolbarPlaceholder,
}: {
  reserveUpNextColumn: boolean;
  upNextVisible: boolean;
  showToolbarPlaceholder: boolean;
}) {
  return (
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
          <Skeleton
            variant="rectangular"
            sx={{
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: { xs: 0, sm: 1 },
              [MOBILE_PORTRAIT]: { borderRadius: 0 },
            }}
          />
          {showToolbarPlaceholder ? (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Skeleton
                variant="rounded"
                width={160}
                height={40}
                sx={{ borderRadius: 999 }}
              />
            </Box>
          ) : null}
          <Stack spacing={1.5} sx={watchBelowPlayerPadSx}>
            <Skeleton variant="text" width="70%" sx={{ fontSize: "1.5rem" }} />
            <Skeleton variant="text" width="45%" sx={{ fontSize: "0.875rem" }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Skeleton variant="rounded" width={112} height={36} />
              <Skeleton variant="rounded" width={120} height={36} />
              <Skeleton variant="rounded" width={100} height={36} />
            </Stack>
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

const watchBelowPlayerPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
} as const;

const watchSidebarPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
} as const;

export function WatchPageSkeleton({ videoId }: { videoId: string }) {
  const { visible: upNextVisible } = useWatchUpNextVisible();
  const { enabled: narrowPlayerLayout } = useWatchNarrowPlayerLayout();
  const showBottomNav = useShowBottomNav();
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
          showToolbarPlaceholder={showBottomNav}
        />
      </Container>
    </Box>
  );
}

export function WatchPageClient({
  videoId,
  commentsEnabled,
}: WatchPageClientProps) {
  const searchParams = useSearchParams();
  const { video, error, isInitialLoad, refresh } = useWatchVideo(videoId);

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
          sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1, sm: 0 } }}
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
