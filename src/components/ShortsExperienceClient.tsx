"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { GoToChannelButton } from "@/components/GoToChannelButton";
import { LiteYouTubeEmbed } from "@/components/LiteYouTubeEmbed";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import type { VideoSummary } from "@/components/VideoSummary";
import { WatchLaterAddButton } from "@/components/WatchLaterAddButton";
import { parseYouTubeTimeParam } from "@/lib/youtubeTime";
import { watchNavigationCaptureHandlers } from "@/lib/watchReturnNavigation";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";

type ShortsExperienceClientProps = {
  videoId: string;
  title: string;
  thumb: string;
  startSeconds: number;
  video: WatchVideoDetails;
  channelPageHref: string | null;
  relatedShorts: VideoSummary[];
  queueIds: string[];
};

export function ShortsExperienceClient({
  videoId,
  title,
  thumb,
  startSeconds,
  video,
  channelPageHref,
  relatedShorts,
  queueIds,
}: ShortsExperienceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlStartSeconds =
    parseYouTubeTimeParam(searchParams.get("t")) ??
    parseYouTubeTimeParam(searchParams.get("start"));
  const effectiveStartSeconds =
    urlStartSeconds != null && urlStartSeconds > 0 ? urlStartSeconds : startSeconds;

  const queue = useMemo(() => {
    const out: string[] = [];
    for (const id of queueIds) {
      if (!out.includes(id)) out.push(id);
    }
    if (!out.includes(videoId)) out.unshift(videoId);
    return out;
  }, [queueIds, videoId]);

  const queueQuery = useMemo(
    () => `q=${encodeURIComponent(queue.join(","))}`,
    [queue],
  );
  const currentIndex = Math.max(0, queue.indexOf(videoId));
  const prevId = currentIndex > 0 ? queue[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 ? queue[currentIndex + 1] ?? null : null;
  const prevShortHref = prevId ? `/shorts/${prevId}?${queueQuery}` : null;
  const nextShortHref = nextId ? `/shorts/${nextId}?${queueQuery}` : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if ((event.key === "ArrowDown" || event.key.toLowerCase() === "j") && nextShortHref) {
        event.preventDefault();
        router.push(nextShortHref);
        return;
      }
      if ((event.key === "ArrowUp" || event.key.toLowerCase() === "k") && prevShortHref) {
        event.preventDefault();
        router.push(prevShortHref);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextShortHref, prevShortHref, router]);

  return (
    <Container maxWidth="md" sx={{ pb: { xs: 4, sm: 6 } }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box sx={{ width: "100%", maxWidth: 420 }}>
            <LiteYouTubeEmbed
              videoId={videoId}
              title={title}
              thumbnailUrl={thumb}
              channelName={video.channelName}
              startSeconds={effectiveStartSeconds}
              aspectRatio="9 / 16"
            />
          </Box>
        </Box>

        <Stack spacing={1}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {video.channelName}
            {video.uploadedAt ? ` · ${video.uploadedAt}` : ""}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {channelPageHref ? <GoToChannelButton href={channelPageHref} /> : null}
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
          {prevShortHref ? (
            <Button
              component={Link}
              href={prevShortHref}
              variant="outlined"
              {...watchNavigationCaptureHandlers()}
            >
              Previous short
            </Button>
          ) : null}
          {nextShortHref ? (
            <Button
              component={Link}
              href={nextShortHref}
              variant="contained"
              {...watchNavigationCaptureHandlers()}
            >
              Next short
            </Button>
          ) : null}
        </Stack>

        {relatedShorts.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              More shorts
            </Typography>
            <Stack spacing={0.75}>
              {relatedShorts.slice(0, 8).map((item) => (
                <Button
                  key={item.id}
                  component={Link}
                  href={`/shorts/${item.id}?${queueQuery}`}
                  variant={item.id === videoId ? "contained" : "text"}
                  size="small"
                  sx={{ justifyContent: "flex-start", textTransform: "none" }}
                  {...watchNavigationCaptureHandlers()}
                >
                  {item.title}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
