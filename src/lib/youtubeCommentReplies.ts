import { createRequire } from "node:module";
import { join } from "node:path";

import { Parser } from "youtubei.js";

import { getInnertube } from "@/lib/youtubeiClient";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";
import type { WatchVideoComment, WatchVideoCommentSort } from "@/lib/youtubeTypes";

/**
 * Comment reply continuations for the current YouTube InnerTube wire format.
 *
 * youtubei’s public `CommentThread.getReplies()` often fails because reply continuations moved
 * (e.g. under `subThreads` / `comment-replies-item-*`) and some `NavigationEndpoint` payloads
 * parse empty, so we build the same `/next` requests the library uses and sometimes read
 * continuation tokens from the raw response JSON.
 *
 * Future refactors (pick one when this feels too heavy):
 * - Upstream: contribute to youtubei.js so `getReplies` / `CommentReplies` parse `subThreads`
 *   and expose tokens without app-level JSON scraping.
 * - patch-package: patch `node_modules` and keep a versioned patch file (re-apply on upgrades).
 * - Fork: depend on `@scope/youtubei.js` or a git URL with exports for the bits we need.
 */
const require = createRequire(join(process.cwd(), "package.json"));

const pkgRoot = join(process.cwd(), "node_modules/youtubei.js");

/**
 * Why not `import … from "youtubei.js/dist/…"`?
 * - The package `exports` field does not expose these files; Node throws ERR_PACKAGE_PATH_NOT_EXPORTED.
 * - Next/Turbopack also won’t resolve those subpaths as normal imports.
 * `createRequire` + absolute paths under `node_modules` loads the same modules the library uses
 * at runtime. No extra install step (unlike patch-package).
 */
const Comment = (
  require(join(pkgRoot, "dist/src/parser/classes/comments/Comment.js")) as {
    default: new (...args: unknown[]) => unknown;
  }
).default;
const CommentView = (
  require(join(pkgRoot, "dist/src/parser/classes/comments/CommentView.js")) as {
    default: new (...args: unknown[]) => unknown;
  }
).default;
const { NextEndpoint } = require(join(
  pkgRoot,
  "dist/src/core/endpoints/index.js",
)) as {
  NextEndpoint: {
    PATH: string;
    build: (x: { continuation: string }) => Record<string, unknown>;
  };
};
const { GetCommentsSectionParams } = require(join(
  pkgRoot,
  "dist/protos/generated/misc/params.js",
)) as {
  GetCommentsSectionParams: { encode: (x: unknown) => { finish: () => Uint8Array } };
};
const { u8ToBase64 } = require(join(
  pkgRoot,
  "dist/src/utils/Utils.js",
)) as { u8ToBase64: (u: Uint8Array) => string };

function sortToProto(sort: WatchVideoCommentSort): 0 | 1 {
  return sort === "newest" ? 1 : 0;
}

function encodeCommentsSectionContinuation(
  videoId: string,
  sort: WatchVideoCommentSort,
): string {
  const writer = GetCommentsSectionParams.encode({
    ctx: { videoId },
    unkParam: 6,
    params: {
      opts: {
        videoId,
        sortBy: sortToProto(sort),
        type: 2,
        commentId: "",
      },
      target: "comments-section",
    },
  });
  return encodeURIComponent(u8ToBase64(writer.finish()));
}

/**
 * Scrape continuation tokens from stringified API responses. Yes, it’s fragile.
 * Prefer: walk `response.data` as a typed object once we have a stable shape, or move this into
 * youtubei after we confirm the JSON schema for `commentReplies` / `subThreads`.
 */
function extractTokenAfterTarget(
  json: string,
  targetSubstr: string,
): string | null {
  const idx = json.indexOf(targetSubstr);
  if (idx < 0) return null;
  const slice = json.slice(idx, idx + 2500);
  const m = slice.match(/"token":"([^"]+)"/);
  return m?.[1] ?? null;
}

/**
 * First page of replies: token is associated with `comment-replies-item-{parentId}` (often in
 * `subThreads`), not only in `commentRepliesData.contents` where older youtubei code looked.
 */
export function extractInitialReplyContinuationToken(
  sectionJson: string,
  parentCommentId: string,
): string | null {
  return extractTokenAfterTarget(
    sectionJson,
    `comment-replies-item-${parentCommentId}`,
  );
}

/**
 * "Show more replies": the next continuation is nested under a button; parsed endpoints can be
 * empty, so we match the token in the raw JSON. Regex may need tightening if YT nests deeper.
 */
export function extractShowMoreRepliesToken(repliesPageJson: string): string | null {
  const m = repliesPageJson.match(
    /"text":"Show more replies"[\s\S]*?"continuationCommand":\s*\{[^}]*"token":"([^"]+)"/,
  );
  return m?.[1] ?? null;
}

function textish(value: { toString?: () => string } | string | undefined): string {
  if (typeof value === "string") return value;
  return value?.toString?.() ?? "";
}

function mapCommentView(view: Record<string, unknown>): WatchVideoComment | null {
  const content = textish(view.content as { toString?: () => string }).trim();
  const id = view.comment_id != null ? String(view.comment_id) : "";
  if (!id || !content) return null;
  const author = view.author as {
    name?: string;
    id?: string;
    url?: string;
    thumbnails?: { url?: string }[];
  };
  const name = author?.name?.trim() || "YouTube user";
  const thumb = author?.thumbnails?.[0]?.url;
  return {
    id,
    authorName: name,
    authorChannelId: author?.id && author.id !== "N/A" ? author.id : undefined,
    authorUrl: author?.url,
    authorThumbnailUrl: thumb,
    content,
    publishedTime: view.published_time
      ? String(view.published_time)
      : undefined,
    likeCount: view.like_count as string | undefined,
    replyCount: view.reply_count ? String(view.reply_count) : undefined,
    pinned: view.is_pinned === true,
    hearted: view.is_hearted === true,
    authorIsChannelOwner: view.author_is_channel_owner === true,
  };
}

function mapTopLevelComment(c: Record<string, unknown>): WatchVideoComment | null {
  const content = textish(c.content as { toString?: () => string }).trim();
  const id = c.comment_id != null ? String(c.comment_id) : "";
  if (!id || !content) return null;
  const author = c.author as {
    name?: string;
    id?: string;
    url?: string;
    thumbnails?: { url?: string }[];
  };
  return {
    id,
    authorName: author?.name?.trim() || "YouTube user",
    authorChannelId: author?.id && author.id !== "N/A" ? author.id : undefined,
    authorUrl: author?.url,
    authorThumbnailUrl: author?.thumbnails?.[0]?.url,
    content,
    publishedTime: (c.published as { toString?: () => string } | undefined)?.toString?.(),
    likeCount: c.vote_count as string | undefined,
    replyCount:
      c.reply_count != null ? String(c.reply_count) : undefined,
    pinned: c.is_pinned === true,
    hearted: c.is_hearted === true,
    authorIsChannelOwner: c.author_is_channel_owner === true,
  };
}

/**
 * `memo.getType(Comment, CommentView)` needs the real class references from the same youtubei
 * install as the parsed nodes (so `instanceof` matches). The loose `Record` mapping below is to
 * satisfy our types without importing full youtubei TS types for internals.
 */
function mapReplyNode(node: unknown): WatchVideoComment | null {
  if (node instanceof CommentView) {
    return mapCommentView(node as unknown as Record<string, unknown>);
  }
  if (node instanceof Comment) {
    return mapTopLevelComment(node as unknown as Record<string, unknown>);
  }
  return null;
}

export type WatchVideoCommentReplies = {
  parentCommentId: string;
  sort: WatchVideoCommentSort;
  replies: WatchVideoComment[];
  hasMore: boolean;
  nextContinuation: string | null;
};

/**
 * Fetches one page of replies for a top-level comment. Pass `continuation` from a prior
 * response's `nextContinuation` to load the next page (lazy "Show more replies").
 */
export async function getWatchVideoCommentReplies(
  videoId: string,
  options: {
    parentCommentId: string;
    sort: WatchVideoCommentSort;
    continuation?: string;
  },
): Promise<WatchVideoCommentReplies | null> {
  if (!isValidYoutubeVideoId(videoId)) return null;
  const { parentCommentId, sort, continuation: continuationIn } = options;
  if (!parentCommentId) return null;

  try {
    const yt = await getInnertube();
    let token = continuationIn?.trim() || null;

    if (!token) {
      // Load the full comments section (same request shape as `Innertube.getComments`) so we can
      // find the per-thread reply continuation token; it is not always available on the parsed
      // `CommentThread` object alone.
      const cont = encodeCommentsSectionContinuation(videoId, sort);
      const section = await yt.actions.execute(
        NextEndpoint.PATH,
        NextEndpoint.build({ continuation: cont }),
      );
      const raw = JSON.stringify(section.data);
      token = extractInitialReplyContinuationToken(raw, parentCommentId);
      if (!token) return null;
    }

    const next = await yt.actions.execute(
      NextEndpoint.PATH,
      NextEndpoint.build({ continuation: token }),
    );
    const rawPage = JSON.stringify(next.data);
    const parsed = Parser.parseResponse(next.data);
    const memo = parsed.on_response_received_endpoints_memo;
    if (!memo) return null;

    // `as never` keeps TypeScript happy with dynamically required YTNode constructors.
    const nodes = memo.getType(
      Comment as never,
      CommentView as never,
    ) as unknown[];
    const replies: WatchVideoComment[] = [];
    for (const n of nodes) {
      const mapped = mapReplyNode(n);
      if (mapped) replies.push(mapped);
    }

    const moreToken = extractShowMoreRepliesToken(rawPage);

    return {
      parentCommentId,
      sort,
      replies,
      hasMore: Boolean(moreToken),
      nextContinuation: moreToken,
    };
  } catch {
    return null;
  }
}
