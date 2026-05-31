import {
  cleantubeCommentsDebugLog,
  readCleantubeCommentsPositiveIntEnv,
} from "@/lib/cleantubeCommentsDebug";
import { getInnertube } from "@/lib/youtubeiClient";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";
import type {
  WatchVideoComment,
  WatchVideoComments,
  WatchVideoCommentSort,
} from "@/lib/youtubeTypes";

type Textish = {
  toString?: () => string;
};

type Thumbnailish = {
  url?: string;
};

type CommentAuthorLike = {
  id?: string;
  name?: string;
  url?: string;
  thumbnails?: Thumbnailish[];
};

type CommentLike = {
  comment_id?: string;
  content?: Textish;
  published_time?: string;
  author?: CommentAuthorLike;
  like_count?: string;
  reply_count?: string;
  is_pinned?: boolean;
  is_hearted?: boolean;
  author_is_channel_owner?: boolean;
};

type CommentThreadLike = {
  comment?: CommentLike;
};

type CommentsPageLike = {
  header?: {
    count?: Textish;
    comments_count?: Textish;
  };
  contents?: CommentThreadLike[];
  has_continuation?: boolean;
  getContinuation?: () => Promise<CommentsPageLike>;
};

const PAGE_SIZE = 8;

/** Max InnerTube comment-section continuation fetches per request (includes walking to reach `page`). */
/** Hobby-friendly default; override via CLEANTUBE_COMMENTS_MAX_CONTINUATION_PAGES. */
const DEFAULT_MAX_COMMENT_CONTINUATION_PAGES = 16;
const ENV_MAX_COMMENT_CONTINUATION_PAGES = "CLEANTUBE_COMMENTS_MAX_CONTINUATION_PAGES";

function maxCommentContinuationPages(): number {
  return readCleantubeCommentsPositiveIntEnv(
    ENV_MAX_COMMENT_CONTINUATION_PAGES,
    DEFAULT_MAX_COMMENT_CONTINUATION_PAGES,
  );
}

function text(value: Textish | string | undefined): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  const out = value?.toString?.().trim();
  return out || undefined;
}

function mapComment(comment: CommentLike | undefined): WatchVideoComment | null {
  const content = text(comment?.content);
  if (!comment?.comment_id || !content) return null;

  const author = comment.author;
  return {
    id: comment.comment_id,
    authorName: author?.name?.trim() || "YouTube user",
    authorChannelId: author?.id,
    authorUrl: author?.url,
    authorThumbnailUrl: author?.thumbnails?.find((thumbnail) => thumbnail.url)?.url,
    content,
    publishedTime: comment.published_time,
    likeCount: comment.like_count,
    replyCount: comment.reply_count,
    pinned: comment.is_pinned === true,
    hearted: comment.is_hearted === true,
    authorIsChannelOwner: comment.author_is_channel_owner === true,
  };
}

export function normalizeCommentSort(
  value: string | undefined,
): WatchVideoCommentSort {
  return value === "newest" ? "newest" : "top";
}

export function normalizeCommentPage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10) : 1;
}

export async function getWatchVideoComments(
  videoId: string,
  options?: {
    sort?: WatchVideoCommentSort;
    page?: number;
  },
): Promise<WatchVideoComments | null> {
  if (!isValidYoutubeVideoId(videoId)) return null;

  const sort = options?.sort ?? "top";
  const pageNumber = options?.page ?? 1;
  const targetCount = pageNumber * PAGE_SIZE;
  const maxContinuations = maxCommentContinuationPages();
  const started = Date.now();

  try {
    const yt = await getInnertube();
    let page = (await yt.getComments(
      videoId,
      sort === "newest" ? "NEWEST_FIRST" : "TOP_COMMENTS",
    )) as CommentsPageLike;
    const countText = text(page.header?.count) || text(page.header?.comments_count);
    const comments: WatchVideoComment[] = [];
    let continuationFetches = 0;
    let hitContinuationCap = false;

    while (comments.length < targetCount) {
      const nextComments = (page.contents ?? [])
        .map((thread) => mapComment(thread.comment))
        .filter((comment): comment is WatchVideoComment => Boolean(comment));

      comments.push(
        ...nextComments.filter(
          (comment) => !comments.some((entry) => entry.id === comment.id),
        ),
      );

      if (comments.length >= targetCount) {
        break;
      }

      if (!page.has_continuation || typeof page.getContinuation !== "function") {
        break;
      }

      if (continuationFetches >= maxContinuations) {
        hitContinuationCap = true;
        break;
      }

      continuationFetches += 1;
      page = await page.getContinuation();
    }

    const cappedBeforeTarget = hitContinuationCap && comments.length < targetCount;
    const fetchLimitedNote = cappedBeforeTarget
      ? "Fewer comments were loaded than requested because pagination was limited for this request. You can try again or open the video on YouTube for the full thread."
      : undefined;

    const hasMore = cappedBeforeTarget
      ? false
      : comments.length > targetCount ||
        page.has_continuation === true ||
        (page.contents?.length ?? 0) > targetCount;

    cleantubeCommentsDebugLog("getWatchVideoComments", {
      videoId,
      sort,
      page: pageNumber,
      targetCount,
      ms: Date.now() - started,
      continuationFetches,
      hitContinuationCap,
      returned: Math.min(comments.length, targetCount),
    });

    return {
      countText,
      sort,
      page: pageNumber,
      hasMore,
      fetchLimitedNote,
      comments: comments.slice(0, targetCount),
    };
  } catch {
    return null;
  }
}
