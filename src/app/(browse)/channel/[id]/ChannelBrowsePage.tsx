"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";

import { ChannelGridEmptyState } from "@/components/ChannelGridEmptyState";
import { CondensedDescription } from "@/components/CondensedDescription";
import { ChannelPagination } from "@/components/ChannelPagination";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { VideoResultsGrid } from "@/components/VideoResultsGrid";
import { setWatchReturnChannelLabel } from "@/lib/watchReturnNavigation";
import { toVideoSummaries } from "@/lib/serializeVideo";
import type { ChannelVideosPage } from "@/lib/youtubeTypes";

export type ChannelBrowsePageProps = {
  page: ChannelVideosPage;
  pageRaw?: string;
  isRefreshing?: boolean;
  isPageTransitioning?: boolean;
  isPageSynced?: boolean;
};

export function ChannelBrowsePage({
  page,
  pageRaw,
  isRefreshing = false,
  isPageTransitioning = false,
  isPageSynced = true,
}: ChannelBrowsePageProps) {
  useEffect(() => {
    const name = page.channel.title?.trim();
    if (name) setWatchReturnChannelLabel(name);
  }, [page.channel.title]);

  const videos = toVideoSummaries(page.videos);
  const urlPage = Number.parseInt(pageRaw ?? "1", 10) || 1;
  const currentPage = isPageSynced
    ? Number.parseInt(page.pageToken ?? "1", 10) || 1
    : urlPage;
  const gridLoading = isRefreshing || isPageTransitioning || !isPageSynced;
  const paginationDisabled = isPageTransitioning || !isPageSynced;

  const metaParts = [
    page.channel.handle,
    page.channel.subscriberText,
    page.channel.videoCountText,
  ].filter(Boolean);

  const emptyHint = page.emptyGridHint ?? "likely_empty";

  const showBanner =
    Boolean(page.channel.bannerUrl) &&
    page.channel.bannerUrl !== page.channel.thumbnailUrl;

  return (
    <Box component="main" sx={{ pb: 6 }}>
      {showBanner ? (
        <Box
          sx={{
            width: "100%",
            minHeight: { xs: 140, sm: 200 },
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%), url(${page.channel.bannerUrl})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : null}

      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar
              src={page.channel.thumbnailUrl}
              alt=""
              sx={{ width: 80, height: 80, bgcolor: "primary.main" }}
            >
              {page.channel.title.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                {page.channel.title}
              </Typography>
              {metaParts.length > 0 ? (
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {metaParts.join(" · ")}
                </Typography>
              ) : null}
              {page.channel.description ? (
                <CondensedDescription
                  text={page.channel.description}
                  dialogTitle={page.channel.title}
                />
              ) : null}
            </Box>
            <SaveChannelButton
              channelName={page.channel.title}
              channelId={page.channel.id}
              channelUrl={page.channel.channelUrl}
              thumbnailUrl={page.channel.thumbnailUrl}
            />
          </Stack>
        </Paper>

        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mb: 2 }}
        >
          <ChannelPagination
            channelId={page.channel.id}
            currentPage={currentPage}
            hasNextPage={isPageSynced ? Boolean(page.nextPageToken) : true}
            totalPages={isPageSynced ? page.totalPages : undefined}
            disabled={paginationDisabled}
          />
        </Stack>

        {videos.length === 0 ? (
          <ChannelGridEmptyState
            hint={emptyHint === "try_again" ? "try_again" : "likely_empty"}
            partialLoad={page.gridPartialLoad}
          />
        ) : (
          <Box
            sx={{
              position: "relative",
              opacity: gridLoading ? 0.5 : 1,
              transition: "opacity 0.15s ease",
            }}
          >
            {gridLoading ? (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  justifyContent: "center",
                  pt: 4,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              >
                <CircularProgress size={28} aria-label="Loading videos" />
              </Box>
            ) : null}
            <Box data-channel-grid-ready={!gridLoading ? true : undefined}>
              <VideoResultsGrid videos={videos} />
            </Box>
          </Box>
        )}

        <Stack alignItems="center" sx={{ mt: 4 }}>
          <ChannelPagination
            channelId={page.channel.id}
            currentPage={currentPage}
            hasNextPage={isPageSynced ? Boolean(page.nextPageToken) : true}
            totalPages={isPageSynced ? page.totalPages : undefined}
            disabled={paginationDisabled}
          />
        </Stack>
      </Container>
    </Box>
  );
}
