"use client";

import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo } from "react";

import { ChannelGridEmptyState } from "@/components/ChannelGridEmptyState";
import { CondensedDescription } from "@/components/CondensedDescription";
import { ChannelPagination } from "@/components/ChannelPagination";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { VideoResultsGrid } from "@/components/VideoResultsGrid";
import {
  buildChannelPageCacheKey,
  writeChannelPageCache,
} from "@/lib/channelPageClientCache";
import { setWatchReturnChannelLabel } from "@/lib/watchReturnNavigation";
import { toVideoSummaries } from "@/lib/serializeVideo";
import type { ChannelSortMode, ChannelVideosPage } from "@/lib/youtubeTypes";

function channelHref(
  id: string,
  options?: { sort?: ChannelSortMode; page?: string; grid?: string },
): string {
  const qs = new URLSearchParams();
  if (options?.sort && options.sort !== "latest") {
    qs.set("sort", options.sort);
  }
  if (options?.page && options.page !== "1") {
    qs.set("page", options.page);
  }
  if (options?.grid) {
    qs.set("grid", options.grid);
  }
  const query = qs.toString();
  return `/channel/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}

export type ChannelBrowsePageProps = {
  page: ChannelVideosPage;
  sort: ChannelSortMode;
  gridQuery?: string;
  /** True when rendered from sessionStorage after the server returned no page. */
  stale?: boolean;
};

export function ChannelBrowsePage({
  page,
  sort,
  gridQuery,
  stale = false,
}: ChannelBrowsePageProps) {
  const cacheKey = useMemo(
    () =>
      buildChannelPageCacheKey({
        channelId: page.channel.id,
        sort: page.sort,
        pageToken: page.pageToken,
      }),
    [page.channel.id, page.sort, page.pageToken],
  );

  useEffect(() => {
    if (stale) return;
    writeChannelPageCache(cacheKey, page);
  }, [cacheKey, page, stale]);

  useEffect(() => {
    const name = page.channel.title?.trim();
    if (name) setWatchReturnChannelLabel(name);
  }, [page.channel.title]);

  const videos = toVideoSummaries(page.videos);
  const currentPage = Number.parseInt(page.pageToken ?? "1", 10) || 1;
  const metaParts = [
    page.channel.handle,
    page.channel.subscriberText,
    page.channel.videoCountText,
  ].filter(Boolean);

  const emptyHint = page.emptyGridHint ?? "likely_empty";

  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        {stale ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Showing cached results from your last successful load. Refresh the page
            or use Retry below to try again for the latest from YouTube.
          </Alert>
        ) : null}

        {page.channel.bannerUrl ? (
          <Box
            sx={{
              minHeight: { xs: 120, sm: 180 },
              mb: 2,
              borderRadius: 3,
              backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.35), rgba(0,0,0,0)), url(${page.channel.bannerUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        ) : null}

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
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              href={channelHref(page.channel.id, {
                sort: "latest",
                page: page.pageToken,
                grid: gridQuery,
              })}
              variant={sort === "latest" ? "contained" : "outlined"}
            >
              Latest
            </Button>
            <Button
              href={channelHref(page.channel.id, {
                sort: "popular",
                page: page.pageToken,
                grid: gridQuery,
              })}
              variant={sort === "popular" ? "contained" : "outlined"}
            >
              Popular
            </Button>
          </Stack>
          <Box sx={{ alignSelf: { xs: "center", sm: "auto" } }}>
            <ChannelPagination
              channelId={page.channel.id}
              sort={sort}
              currentPage={currentPage}
              hasNextPage={Boolean(page.nextPageToken)}
              totalPages={page.totalPages}
              gridQuery={gridQuery}
            />
          </Box>
        </Stack>

        {videos.length === 0 ? (
          <ChannelGridEmptyState
            hint={emptyHint === "try_again" ? "try_again" : "likely_empty"}
            partialLoad={page.gridPartialLoad}
          />
        ) : (
          <Box data-channel-grid-ready>
            <VideoResultsGrid videos={videos} />
          </Box>
        )}

        <Stack alignItems="center" sx={{ mt: 4 }}>
          <ChannelPagination
            channelId={page.channel.id}
            sort={sort}
            currentPage={currentPage}
            hasNextPage={Boolean(page.nextPageToken)}
            totalPages={page.totalPages}
            gridQuery={gridQuery}
          />
        </Stack>
      </Container>
    </Box>
  );
}
