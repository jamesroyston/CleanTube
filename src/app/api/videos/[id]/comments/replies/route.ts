import { NextResponse } from "next/server";

import { getWatchVideoCommentReplies } from "@/lib/youtubeCommentReplies";
import {
  normalizeCommentSort,
} from "@/lib/youtubeComments";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isValidYoutubeVideoId(id)) {
    return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
  }

  const url = new URL(request.url);
  const parent = url.searchParams.get("parent")?.trim();
  if (!parent) {
    return NextResponse.json(
      { error: "Missing parent comment id." },
      { status: 400 },
    );
  }

  const sort = normalizeCommentSort(url.searchParams.get("sort") ?? undefined);
  const continuation =
    url.searchParams.get("continuation")?.trim() || undefined;

  const payload = await getWatchVideoCommentReplies(id, {
    parentCommentId: parent,
    sort,
    continuation,
  });

  if (!payload) {
    return NextResponse.json(
      { error: "Replies are unavailable for this thread." },
      { status: 404 },
    );
  }

  return NextResponse.json({ replies: payload });
}
