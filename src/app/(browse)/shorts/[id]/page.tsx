import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShortsExperienceClient } from "@/components/ShortsExperienceClient";
import { WatchBackLink } from "@/components/WatchBackLink";
import { WatchLaterBanner } from "@/components/WatchLaterBanner";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { getWatchVideoDetails } from "@/lib/watchVideo";
import { getWatchNextRelatedShorts } from "@/lib/youtubeWatchNext";
import { startSecondsFromWatchPageQuery } from "@/lib/youtubeTime";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
  isValidYoutubeChannelId,
  isValidYoutubeVideoId,
} from "@/lib/youtubeUrl";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; start?: string; q?: string }>;
};

export const runtime = "nodejs";

function queueFromSearchParam(raw: string | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(",")) {
    const id = token.trim();
    if (!isValidYoutubeVideoId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 24) break;
  }
  return out;
}

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
    return { title: "Short — CleanTube" };
  }
  const video = await getWatchVideoDetails(id);
  return {
    title: video?.title ? `${video.title} — CleanTube Shorts` : "Shorts — CleanTube",
    description: video?.description?.slice(0, 160),
  };
}

export default async function ShortsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isValidYoutubeVideoId(id)) notFound();

  const [video, relatedShorts] = await Promise.all([
    getWatchVideoDetails(id),
    getWatchNextRelatedShorts(id),
  ]);
  if (!video) notFound();

  const startSeconds = startSecondsFromWatchPageQuery(sp);
  const title = video.title ?? "Short";
  const thumb = video.thumbnailUrl ?? `https://i.ytimg.com/vi/${id}/sddefault.jpg`;
  const channelPageHref = channelHrefForWatchVideo(video);
  const relatedSummaries = toVideoSummaries(relatedShorts);
  const queueSeed = queueFromSearchParam(sp.q);
  const queue = [id, ...queueSeed, ...relatedSummaries.map((item) => item.id)].filter(
    (value, index, arr) => arr.indexOf(value) === index,
  );

  return (
    <Box component="main" sx={{ pb: { xs: 4, sm: 6 } }}>
      <Container
        maxWidth="md"
        disableGutters
        sx={{
          pt: { xs: 0, sm: 2 },
          px: { xs: 0, sm: 3 },
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1.5, sm: 0 } }}>
          <WatchLaterBanner videoId={id} />
          <WatchBackLink />
        </Box>
      </Container>

      <ShortsExperienceClient
        videoId={id}
        title={title}
        thumb={thumb}
        startSeconds={startSeconds ?? 0}
        video={video}
        channelPageHref={channelPageHref}
        relatedShorts={relatedSummaries}
        queueIds={queue}
      />
    </Box>
  );
}
