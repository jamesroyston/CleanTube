import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChannelBrowsePage } from "./ChannelBrowsePage";
import { ChannelRecoverableGate } from "./ChannelRecoverableGate";
import { getChannelVideosPageCached } from "@/lib/youtubeChannel";
import { getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
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
  const channel = await getChannelDetailsCached(id);

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

  if (!isValidYoutubeChannelId(id)) {
    const channel = await getChannelDetailsCached(id);
    if (channel?.id && channel.id !== id) {
      redirect(channelHref(channel.id, { sort, page: pageRaw, grid: gridQuery }));
    }
  }

  const page = await getChannelVideosPageCached({
    channelId: id,
    sort,
    pageToken: pageRaw,
  });

  if (!page) {
    return (
      <ChannelRecoverableGate
        channelId={id}
        sort={sort}
        pageRaw={pageRaw}
        gridQuery={gridQuery}
      />
    );
  }

  return (
    <ChannelBrowsePage
      page={page}
      sort={sort}
      gridQuery={gridQuery}
    />
  );
}
