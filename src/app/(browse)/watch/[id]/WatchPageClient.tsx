"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { WatchBackLink } from "@/components/WatchBackLink";
import { WatchExperienceClient } from "@/components/WatchExperienceClient";
import { WatchLaterBanner } from "@/components/WatchLaterBanner";
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

export function WatchPageSkeleton({ videoId }: { videoId: string }) {
  return (
    <Box component="main" sx={{ pb: { xs: 4, sm: 6 } }}>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ pt: { xs: 0, sm: 2 }, px: { xs: 0, sm: 3 } }}
      >
        <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1.5, sm: 0 } }}>
          <WatchLaterBanner videoId={videoId} />
          <WatchBackLink />
        </Box>
      </Container>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ pt: { xs: 0, sm: 2 }, px: { xs: 0, sm: 3 } }}
      >
        <Stack spacing={2} sx={{ px: { xs: 2, sm: 0 } }}>
          <Skeleton
            variant="rectangular"
            sx={{
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: { xs: 0, sm: 1 },
            }}
          />
          <Skeleton variant="text" width="70%" height={36} />
          <Skeleton variant="text" width="40%" />
        </Stack>
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
          sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1.5, sm: 0 } }}
        >
          <WatchLaterBanner videoId={videoId} />
          <WatchBackLink />
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
