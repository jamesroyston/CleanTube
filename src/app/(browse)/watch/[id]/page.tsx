import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackToSearch } from "@/components/BackToSearch";
import { LiteYouTubeEmbed } from "@/components/LiteYouTubeEmbed";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { WatchLaterAddButton } from "@/components/WatchLaterAddButton";
import { WatchLaterBanner } from "@/components/WatchLaterBanner";
import { startSecondsFromWatchPageQuery } from "@/lib/youtubeTime";
import { getWatchVideoDetails } from "@/lib/watchVideo";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; start?: string }>;
};

export const runtime = "nodejs";

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

  const video = await getWatchVideoDetails(id);
  if (!video) {
    notFound();
  }

  const startSeconds = startSecondsFromWatchPageQuery(sp);
  const title = video.title ?? "Video";
  const metaParts = [
    video.channelName,
    video.uploadedAt,
    video.views > 0 ? `${video.views.toLocaleString()} views` : null,
  ].filter(Boolean);

  const thumb =
    video.thumbnailUrl ??
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`;

  return (
    <Box
      component="main"
      sx={{
        pb: { xs: 4, sm: 6 },
        minHeight: "100vh",
      }}
    >
      <Container
        maxWidth="md"
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

          <BackToSearch />
        </Box>

        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
          }}
        >
          {/* TODO: Revisit mobile landscape full-bleed playback without fighting browser chrome. */}
          <LiteYouTubeEmbed
            videoId={id}
            title={title}
            thumbnailUrl={thumb}
            channelName={video.channelName}
            startSeconds={startSeconds}
          />
        </Box>

        <Stack
          className="watch-page-chrome"
          spacing={1.5}
          sx={{
            px: { xs: 2, sm: 0 },
          }}
        >
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {metaParts.join(" · ")}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <SaveChannelButton
              channelName={video.channelName}
              channelId={video.channelId}
              channelUrl={video.channelUrl}
            />
            <WatchLaterAddButton
              videoId={id}
              title={title}
              thumbnailUrl={thumb}
              channelName={video.channelName}
              startSecondsContext={startSeconds}
            />
          </Stack>
          {video.description?.trim() ? (
            <Typography
              variant="body2"
              component="div"
              sx={{
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
                whiteSpace: "pre-wrap",
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              {video.description.trim()}
            </Typography>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
