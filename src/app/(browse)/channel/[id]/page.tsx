import type { Metadata } from "next";

import { ChannelPageClient } from "./ChannelPageClient";
import { decodeRouteToken } from "@/lib/decodeRouteToken";
import { getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
import type { ChannelSortMode } from "@/lib/youtubeTypes";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; page?: string; grid?: string }>;
};

export const runtime = "nodejs";

function normalizeChannelSort(value: string | undefined): ChannelSortMode {
  return value === "popular" ? "popular" : "latest";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = decodeRouteToken(rawId);
  const channel = await getChannelDetailsCached(id);

  return {
    title: channel?.title
      ? `${channel.title} — CleanTube`
      : "Channel — CleanTube",
    description: channel?.description?.slice(0, 160),
  };
}

/**
 * Shell renders immediately; grid loads client-side via SWR + `/api/channel` (For You pattern).
 */
export default async function ChannelPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const { sort: sortRaw, page: pageRaw, grid: gridRaw } = await searchParams;
  const id = decodeRouteToken(rawId);
  const sort = normalizeChannelSort(sortRaw);
  const gridQuery = gridRaw?.trim() || undefined;

  return (
    <ChannelPageClient
      channelId={id}
      sort={sort}
      pageRaw={pageRaw}
      gridQuery={gridQuery}
    />
  );
}
