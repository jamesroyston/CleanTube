import { NextResponse } from "next/server";

import {
  cleantubeCommentsDebugLog,
  isCleantubeCommentsDebugEnabled,
} from "@/lib/cleantubeCommentsDebug";
import {
  getWatchVideoComments,
  normalizeCommentPage,
  normalizeCommentSort,
} from "@/lib/youtubeComments";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isValidYoutubeVideoId(id)) {
      return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
    }

    const url = new URL(request.url);
    const started = Date.now();
    const comments = await getWatchVideoComments(id, {
      sort: normalizeCommentSort(url.searchParams.get("sort") ?? undefined),
      page: normalizeCommentPage(url.searchParams.get("page") ?? undefined),
    });
    if (isCleantubeCommentsDebugEnabled()) {
      cleantubeCommentsDebugLog("GET /api/videos/[id]/comments", {
        videoId: id,
        ms: Date.now() - started,
        ok: Boolean(comments),
        page: comments?.page,
        hasMore: comments?.hasMore,
        capped: Boolean(comments?.fetchLimitedNote),
      });
    }

    if (!comments) {
      return NextResponse.json(
        { error: "Comments are unavailable for this video." },
        { status: 404 },
      );
    }

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("[api/comments]", err);
    const message =
      err instanceof Error ? err.message : "Failed to load comments.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
