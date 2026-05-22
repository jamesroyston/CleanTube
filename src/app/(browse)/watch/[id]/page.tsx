import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { WatchBackLink } from "@/components/WatchBackLink";
import { WatchExperienceClient } from "@/components/WatchExperienceClient";
import { WatchLaterBanner } from "@/components/WatchLaterBanner";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { startSecondsFromWatchPageQuery } from "@/lib/youtubeTime";
import { getWatchVideoComments } from "@/lib/youtubeComments";
import { readWatchUpNextVisibleFromCookieStore } from "@/lib/watchUpNextVisibilityPersistence";
import { getWatchNextRelatedVideos } from "@/lib/youtubeWatchNext";
import { getWatchVideoDetails } from "@/lib/watchVideo";
import {
  parseWatchCommentsVisibleCookie,
  WATCH_COMMENTS_VISIBLE_COOKIE,
} from "@/lib/watchCommentsVisibilityPersistence";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
  isValidYoutubeChannelId,
  isValidYoutubeVideoId,
} from "@/lib/youtubeUrl";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    t?: string;
    start?: string;
  }>;
};

export const runtime = "nodejs";

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidYoutubeVideoId(id)) {
    return { title: "Video — CleanTube" };
  }
  const video = await getWatchVideoDetails(id);
  return {
    title: video?.title ? `${video.title} — CleanTube` : "Watch — CleanTube",
    description: video?.description?.slice(0, 160),
  };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  if (!isValidYoutubeVideoId(id)) {
    notFound();
  }

  const cookieStore = await cookies();
  const showUpNext = readWatchUpNextVisibleFromCookieStore(cookieStore);
  const showComments = parseWatchCommentsVisibleCookie(
    cookieStore.get(WATCH_COMMENTS_VISIBLE_COOKIE)?.value,
  );

  const [video, comments, watchNext] = await Promise.all([
    getWatchVideoDetails(id),
    showComments ? getWatchVideoComments(id) : Promise.resolve(null),
    showUpNext ? getWatchNextRelatedVideos(id) : Promise.resolve([]),
  ]);
  const watchNextSummaries = toVideoSummaries(watchNext);
  if (!video) {
    notFound();
  }

  const startSeconds = startSecondsFromWatchPageQuery(sp);
  const title = video.title ?? "Video";

  const thumb =
    video.thumbnailUrl ?? `https://i.ytimg.com/vi/${id}/sddefault.jpg`;

  const channelPageHref = channelHrefForWatchVideo(video);

  return (
    <Box
      component="main"
      sx={{
        pb: { xs: 4, sm: 6 },
      }}
    >
      <Container
        maxWidth="lg"
        disableGutters
        sx={{
          pt: { xs: 0, sm: 2 },
          px: { xs: 0, sm: 3 },
        }}
      >
        <Box
          className="watch-page-chrome"
          sx={{
            px: { xs: 2, sm: 0 },
            pt: { xs: 1.5, sm: 0 },
          }}
        >
          <WatchLaterBanner videoId={id} />

          <WatchBackLink />
        </Box>
      </Container>

      <WatchExperienceClient
        key={id}
        videoId={id}
        title={title}
        thumb={thumb}
        startSeconds={startSeconds ?? 0}
        video={video}
        channelPageHref={channelPageHref}
        commentsInitial={showComments ? comments : null}
        watchNextInitial={showUpNext ? watchNextSummaries : []}
      />
    </Box>
  );
}
