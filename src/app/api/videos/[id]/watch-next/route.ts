import { NextResponse } from "next/server";

import { toVideoSummaries } from "@/lib/serializeVideo";
import { getWatchNextRelatedVideos } from "@/lib/youtubeWatchNext";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isValidYoutubeVideoId(id)) {
    return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
  }

  try {
    const related = await getWatchNextRelatedVideos(id);
    return NextResponse.json({ videos: toVideoSummaries(related) });
  } catch (err) {
    console.error("[api/watch-next]", err);
    const message =
      err instanceof Error ? err.message : "Failed to load related videos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
