import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ChannelPagination } from "@/components/ChannelPagination";
import { SaveChannelButton } from "@/components/SaveChannelButton";
import { VideoResultsGrid } from "@/components/VideoResultsGrid";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { getChannelDetails, getChannelVideosPage } from "@/lib/youtubeChannel";
import { isValidYoutubeChannelId } from "@/lib/youtubeUrl";
import type { ChannelSortMode } from "@/lib/youtubeTypes";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export const runtime = "nodejs";

function normalizeChannelSort(value: string | undefined): ChannelSortMode {
  return value === "popular" ? "popular" : "latest";
}

function channelHref(
  id: string,
  options?: { sort?: ChannelSortMode; page?: string },
): string {
  const qs = new URLSearchParams();
  if (options?.sort && options.sort !== "latest") {
    qs.set("sort", options.sort);
  }
  if (options?.page && options.page !== "1") {
    qs.set("page", options.page);
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
  const channel = isValidYoutubeChannelId(id)
    ? (await getChannelVideosPage({ channelId: id, limit: 1 }))?.channel
    : await getChannelDetails(id);

  return {
    title: channel?.title
      ? `${channel.title} — CleanTube`
      : "Channel — CleanTube",
    description: channel?.description?.slice(0, 160),
  };
}

export default async function ChannelPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const { sort: sortRaw, page: pageRaw } = await searchParams;
  const id = decodeRouteToken(rawId);
  const sort = normalizeChannelSort(sortRaw);

  if (!isValidYoutubeChannelId(id)) {
    const channel = await getChannelDetails(id);
    if (channel?.id && channel.id !== id) {
      redirect(channelHref(channel.id, { sort, page: pageRaw }));
    }
  }

  const page = await getChannelVideosPage({
    channelId: id,
    sort,
    pageToken: pageRaw,
  });

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
              href={channelHref(page.channel.id, { sort: "latest" })}
              variant={sort === "latest" ? "contained" : "outlined"}
            >
              Latest
            </Button>
            <Button
              href={channelHref(page.channel.id, { sort: "popular" })}
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
            />
          </Box>
        </Stack>

        {videos.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4 }}>
            No videos found for this channel.
          </Typography>
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
          />
        </Stack>
      </Container>
    </Box>
  );
}
