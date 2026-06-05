import { NextResponse } from "next/server";

import { decodeRouteToken } from "@/lib/decodeRouteToken";
import { getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
import { getChannelVideosPageCached } from "@/lib/youtubeChannel";
import { isValidYoutubeChannelId } from "@/lib/youtubeUrl";
import type { ChannelSortMode, ChannelVideosPage } from "@/lib/youtubeTypes";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeChannelSort(value: string | null): ChannelSortMode {
  return value === "popular" ? "popular" : "latest";
}

function channelRedirectPath(
  id: string,
  sort: ChannelSortMode,
  page: string | null,
  grid: string | null,
): string {
  const qs = new URLSearchParams();
  if (sort !== "latest") qs.set("sort", sort);
  if (page && page !== "1") qs.set("page", page);
  if (grid?.trim()) qs.set("grid", grid.trim());
  const query = qs.toString();
  return `/channel/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}

export type ChannelPageApiResponse =
  | { page: ChannelVideosPage }
  | { redirect: string; error?: never }
  | { error: string; page?: never; redirect?: never };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = decodeRouteToken(rawId);
  const { searchParams } = new URL(request.url);
  const sort = normalizeChannelSort(searchParams.get("sort"));
  const pageRaw = searchParams.get("page");
  const grid = searchParams.get("grid");

  if (!isValidYoutubeChannelId(id)) {
    const channel = await getChannelDetailsCached(id);
    if (channel?.id && channel.id !== id) {
      return NextResponse.json({
        redirect: channelRedirectPath(channel.id, sort, pageRaw, grid),
      } satisfies ChannelPageApiResponse);
    }
  }

  try {
    const page = await getChannelVideosPageCached({
      channelId: id,
      sort,
      pageToken: pageRaw ?? undefined,
    });

    if (!page) {
      return NextResponse.json(
        { error: "Channel could not be loaded." },
        { status: 404 },
      );
    }

    return NextResponse.json({ page } satisfies ChannelPageApiResponse);
  } catch (err) {
    console.error("[api/channel]", id, err);
    const message =
      err instanceof Error ? err.message : "Channel could not be loaded.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
