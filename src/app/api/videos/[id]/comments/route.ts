import { NextResponse } from "next/server";

import {
  getWatchVideoComments,
  normalizeCommentPage,
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
  const comments = await getWatchVideoComments(id, {
    sort: normalizeCommentSort(url.searchParams.get("sort") ?? undefined),
    page: normalizeCommentPage(url.searchParams.get("page") ?? undefined),
  });

  if (!comments) {
    return NextResponse.json(
      { error: "Comments are unavailable for this video." },
      { status: 404 },
    );
  }

  return NextResponse.json({ comments });
}
