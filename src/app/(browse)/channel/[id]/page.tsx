import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ChannelGridEmptyState } from "@/components/ChannelGridEmptyState";
import { ChannelPagination } from "@/components/ChannelPagination";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { VideoResultsGrid } from "@/components/VideoResultsGrid";
import { resolveChannelVideosVariant } from "@/lib/channelVideosVariant";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { getChannelDetails, getChannelVideosPage } from "@/lib/youtubeChannel";
import { isValidYoutubeChannelId } from "@/lib/youtubeUrl";
import type { ChannelSortMode } from "@/lib/youtubeTypes";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; page?: string; grid?: string }>;
};

export const runtime = "nodejs";

function normalizeChannelSort(value: string | undefined): ChannelSortMode {
  return value === "popular" ? "popular" : "latest";
}

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

function decodeRouteToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = decodeRouteToken(rawId);
  /** Title/description only: `getChannel` + about — no `getVideos` (grid loads in the page). */
  const channel = await getChannelDetails(id);

  return {
    title: channel?.title
      ? `${channel.title} — CleanTube`
      : "Channel — CleanTube",
    description: channel?.description?.slice(0, 160),
  };
}

export default async function ChannelPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const { sort: sortRaw, page: pageRaw, grid: gridRaw } = await searchParams;
  const id = decodeRouteToken(rawId);
  const sort = normalizeChannelSort(sortRaw);
  const gridQuery = gridRaw?.trim() || undefined;

  const cookieStore = await cookies();
  const variant = resolveChannelVideosVariant(cookieStore, { grid: gridQuery });

  if (!isValidYoutubeChannelId(id)) {
    const channel = await getChannelDetails(id);
    if (channel?.id && channel.id !== id) {
      redirect(channelHref(channel.id, { sort, page: pageRaw, grid: gridQuery }));
    }
  }

  const page = await getChannelVideosPage(
    {
      channelId: id,
      sort,
      pageToken: pageRaw,
    },
    { variant },
  );

  if (!page) {
    notFound();
  }

  const videos = toVideoSummaries(page.videos);
  const currentPage = Number.parseInt(page.pageToken ?? "1", 10) || 1;
  const metaParts = [
    page.channel.handle,
    page.channel.subscriberText,
    page.channel.videoCountText,
  ].filter(Boolean);

  const emptyHint = page.emptyGridHint ?? "likely_empty";

  return (
    <Box component="main" sx={{ pb: 6, minHeight: "100vh" }}>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 820 }}
                >
                  {page.channel.description}
                </Typography>
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
                page: pageRaw,
                grid: gridQuery,
              })}
              variant={sort === "latest" ? "contained" : "outlined"}
            >
              Latest
            </Button>
            <Button
              href={channelHref(page.channel.id, {
                sort: "popular",
                page: pageRaw,
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
          <VideoResultsGrid videos={videos} />
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
