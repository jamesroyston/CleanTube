import { NextResponse } from "next/server";

import { getWatchVideoDetails } from "@/lib/watchVideo";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export type WatchVideoApiResponse =
  | { video: WatchVideoDetails }
  | { error: string; video?: never };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isValidYoutubeVideoId(id)) {
    return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
  }

  try {
    const video = await getWatchVideoDetails(id);
    if (!video) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    return NextResponse.json({ video } satisfies WatchVideoApiResponse);
  } catch (err) {
    console.error("[api/videos]", id, err);
    const message =
      err instanceof Error ? err.message : "Video could not be loaded.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
