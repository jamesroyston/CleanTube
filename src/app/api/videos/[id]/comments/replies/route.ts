import { NextResponse } from "next/server";

import { getWatchVideoCommentReplies } from "@/lib/youtubeCommentReplies";
import {
  cleantubeCommentsDebugLog,
  isCleantubeCommentsDebugEnabled,
} from "@/lib/cleantubeCommentsDebug";
import { normalizeCommentSort } from "@/lib/youtubeComments";
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

    const started = Date.now();
    const payload = await getWatchVideoCommentReplies(id, {
      parentCommentId: parent,
      sort,
      continuation,
    });
    if (isCleantubeCommentsDebugEnabled()) {
      cleantubeCommentsDebugLog("GET /api/videos/[id]/comments/replies", {
        videoId: id,
        parentCommentId: parent,
        ms: Date.now() - started,
        ok: Boolean(payload),
        replyCount: payload ? payload.replies.length : undefined,
        hasMore: payload?.hasMore,
        capped: Boolean(payload?.fetchLimitedNote),
        continuation: Boolean(continuation),
      });
    }

    if (!payload) {
      return NextResponse.json(
        { error: "Replies are unavailable for this thread." },
        { status: 404 },
      );
    }

    return NextResponse.json({ replies: payload });
  } catch (err) {
    console.error("[api/comments/replies]", err);
    const message =
      err instanceof Error ? err.message : "Failed to load comment replies.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
