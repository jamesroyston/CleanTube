import { NextResponse } from "next/server";

import { decodeRouteToken } from "@/lib/decodeRouteToken";
import { getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
import { getChannelVideosPageCached } from "@/lib/youtubeChannel";
import { isValidYoutubeChannelId } from "@/lib/youtubeUrl";
import type { ChannelVideosPage } from "@/lib/youtubeTypes";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function channelRedirectPath(id: string, page: string | null): string {
  const qs = new URLSearchParams();
  if (page && page !== "1") qs.set("page", page);
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
  const pageRaw = searchParams.get("page");

  if (searchParams.get("sort") === "popular" || searchParams.get("grid")?.trim()) {
    return NextResponse.json({
      redirect: channelRedirectPath(id, pageRaw),
    } satisfies ChannelPageApiResponse);
  }

  if (!isValidYoutubeChannelId(id)) {
    const channel = await getChannelDetailsCached(id);
    if (channel?.id && channel.id !== id) {
      return NextResponse.json({
        redirect: channelRedirectPath(channel.id, pageRaw),
      } satisfies ChannelPageApiResponse);
    }
  }

  try {
    const page = await getChannelVideosPageCached({
      channelId: id,
      sort: "latest",
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
