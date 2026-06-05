import { createRequire } from "node:module";
import { join } from "node:path";

import { Parser } from "youtubei.js";

import {
  cleantubeCommentsDebugLog,
  readCleantubeCommentsPositiveIntEnv,
} from "@/lib/cleantubeCommentsDebug";
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
const pkgRoot = join(process.cwd(), "node_modules/youtubei.js");

type CommentViewCtor = new (...args: unknown[]) => unknown;
type ContinuationItemCtor = new (...args: unknown[]) => unknown;
type NavigationEndpointCtor = new (data: unknown) => {
  call: (actions: unknown, args?: unknown) => Promise<{ data?: unknown }>;
};
type GetCommentsSectionParamsType = {
  encode: (x: unknown) => { finish: () => Uint8Array };
};

let youtubeiInternals: {
  CommentView: CommentViewCtor;
  ContinuationItemClass: ContinuationItemCtor;
  NavigationEndpoint: NavigationEndpointCtor;
  GetCommentsSectionParams: GetCommentsSectionParamsType;
  u8ToBase64: (u: Uint8Array) => string;
} | null = null;

/**
 * Why not `import … from "youtubei.js/dist/…"`?
 * - The package `exports` field does not expose these files; Node throws ERR_PACKAGE_PATH_NOT_EXPORTED.
 * - Next/Turbopack also won't resolve those subpaths as normal imports.
 * `createRequire` + absolute paths under `node_modules` loads the same modules the library uses
 * at runtime. Lazy init avoids webpack evaluating dynamic requires during build page-data collection.
 */
function getYoutubeiInternals() {
  if (youtubeiInternals) return youtubeiInternals;
  const nodeRequire = createRequire(import.meta.url);
  youtubeiInternals = {
    CommentView: (
      nodeRequire(join(pkgRoot, "dist/src/parser/classes/comments/CommentView.js")) as {
        default: CommentViewCtor;
      }
    ).default,
    ContinuationItemClass: (
      nodeRequire(join(pkgRoot, "dist/src/parser/classes/ContinuationItem.js")) as {
        default: ContinuationItemCtor;
      }
    ).default,
    NavigationEndpoint: (
      nodeRequire(join(pkgRoot, "dist/src/parser/classes/NavigationEndpoint.js")) as {
        default: NavigationEndpointCtor;
      }
    ).default,
    GetCommentsSectionParams: (
      nodeRequire(join(pkgRoot, "dist/protos/generated/misc/params.js")) as {
        GetCommentsSectionParams: GetCommentsSectionParamsType;
      }
    ).GetCommentsSectionParams,
    u8ToBase64: (
      nodeRequire(join(pkgRoot, "dist/src/utils/Utils.js")) as {
        u8ToBase64: (u: Uint8Array) => string;
      }
    ).u8ToBase64,
  };
  return youtubeiInternals;
}

/**
 * Why not `import … from "youtubei.js/dist/…"`?
 * - The package `exports` field does not expose these files; Node throws ERR_PACKAGE_PATH_NOT_EXPORTED.
 * - Next/Turbopack also won’t resolve those subpaths as normal imports.
 * `createRequire` + absolute paths under `node_modules` loads the same modules the library uses
 * at runtime. No extra install step (unlike patch-package).
 */
/** Max top-level comment pages walked when locating a thread for direct reply fetch. */
/** Hobby-friendly default; tune via env if needed. */
const DEFAULT_MAX_COMMENT_THREAD_WALK_PAGES = 16;
const ENV_MAX_COMMENT_THREAD_WALK_PAGES = "CLEANTUBE_COMMENTS_MAX_THREAD_WALK_PAGES";

function maxCommentThreadWalkPages(): number {
  return readCleantubeCommentsPositiveIntEnv(
    ENV_MAX_COMMENT_THREAD_WALK_PAGES,
    DEFAULT_MAX_COMMENT_THREAD_WALK_PAGES,
  );
}

/** v17 removed `NextEndpoint`; continuation requests use `NavigationEndpoint` + `/next`. */
function watchNextContinuation(
  actions: unknown,
  token: string,
): Promise<{ data?: unknown }> {
  const { NavigationEndpoint } = getYoutubeiInternals();
  const ep = new NavigationEndpoint({
    continuationCommand: {
      request: "CONTINUATION_REQUEST_TYPE_WATCH_NEXT",
      token,
    },
  });
  return ep.call(actions) as Promise<{ data?: unknown }>;
}

function sortToProto(sort: WatchVideoCommentSort): 0 | 1 {
  return sort === "newest" ? 1 : 0;
}

function encodeCommentsSectionContinuation(
  videoId: string,
  sort: WatchVideoCommentSort,
): string {
  const { GetCommentsSectionParams, u8ToBase64 } = getYoutubeiInternals();
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
 * youtubei.js v17+ removed the standalone `Comment` class; use `CommentView` and a legacy
 * duck-typed fallback for older parsed shapes.
 */
function mapReplyNode(node: unknown): WatchVideoComment | null {
  const { CommentView } = getYoutubeiInternals();
  if (node instanceof CommentView) {
    return mapCommentView(node as unknown as Record<string, unknown>);
  }
  if (
    node &&
    typeof node === "object" &&
    (node as { type?: string }).type === "Comment"
  ) {
    return mapTopLevelComment(node as Record<string, unknown>);
  }
  return null;
}

export type WatchVideoCommentReplies = {
  parentCommentId: string;
  sort: WatchVideoCommentSort;
  replies: WatchVideoComment[];
  hasMore: boolean;
  nextContinuation: string | null;
  /** When set, reply lookup stopped early (thread walk cap) and may be incomplete. */
  fetchLimitedNote?: string;
};

type CommentThreadish = {
  comment?: { comment_id?: string } | null;
  comment_replies_data?: {
    contents: {
      firstOfType: (...types: unknown[]) => unknown;
    };
  } | null;
};

type CommentsPageish = {
  contents: CommentThreadish[];
  has_continuation: boolean;
  getContinuation: () => Promise<CommentsPageish>;
};

async function findCommentThreadForParent(
  yt: Awaited<ReturnType<typeof getInnertube>>,
  videoId: string,
  sort: WatchVideoCommentSort,
  parentCommentId: string,
): Promise<{ thread: CommentThreadish | null; hitThreadWalkCap: boolean }> {
  const sortKey = sort === "newest" ? "NEWEST_FIRST" : "TOP_COMMENTS";
  const maxPages = maxCommentThreadWalkPages();
  let page = (await yt.getComments(videoId, sortKey)) as unknown as CommentsPageish;
  let pagesLoaded = 1;

  for (;;) {
    for (const thread of page.contents) {
      if (thread.comment?.comment_id === parentCommentId) {
        return { thread, hitThreadWalkCap: false };
      }
    }
    if (!page.has_continuation) {
      return { thread: null, hitThreadWalkCap: false };
    }
    if (pagesLoaded >= maxPages) {
      return { thread: null, hitThreadWalkCap: true };
    }
    page = (await page.getContinuation()) as unknown as CommentsPageish;
    pagesLoaded += 1;
  }
}

function tokenFromContinuationItem(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const ep = (item as { endpoint?: { payload?: Record<string, unknown> } }).endpoint;
  const p = ep?.payload;
  if (p && typeof p.continuation === "string" && p.continuation.length > 0) {
    return p.continuation;
  }
  return null;
}

function unwrapInnertubeData(data: unknown): unknown {
  if (
    data &&
    typeof data === "object" &&
    "on_response_received_endpoints_memo" in (data as object)
  ) {
    return data;
  }
  if (data && typeof data === "object" && "data" in (data as object)) {
    return (data as { data: unknown }).data;
  }
  return data;
}

function repliesFromParsedResponse(
  data: unknown,
  parentCommentId: string,
  sort: WatchVideoCommentSort,
): WatchVideoCommentReplies | null {
  const normalized = unwrapInnertubeData(data);
  const rawPage = JSON.stringify(normalized);
  let memo: ReturnType<typeof Parser.parseResponse>["on_response_received_endpoints_memo"];
  if (
    normalized &&
    typeof normalized === "object" &&
    "on_response_received_endpoints_memo" in (normalized as object)
  ) {
    memo = (normalized as { on_response_received_endpoints_memo: typeof memo })
      .on_response_received_endpoints_memo;
  } else {
    memo = Parser.parseResponse(normalized as never).on_response_received_endpoints_memo;
  }
  if (!memo) return null;

  const { CommentView, ContinuationItemClass } = getYoutubeiInternals();
  const nodes = memo.getType(CommentView as never) as unknown[];
  const replies: WatchVideoComment[] = [];
  for (const n of nodes) {
    const mapped = mapReplyNode(n);
    if (mapped) replies.push(mapped);
  }

  const moreItems = memo.getType(ContinuationItemClass as never) as unknown as {
    first?: () => unknown;
    0?: unknown;
  };
  const moreItem =
    typeof moreItems.first === "function" ? moreItems.first() : moreItems[0];
  const moreToken =
    tokenFromContinuationItem(moreItem) ?? extractShowMoreRepliesToken(rawPage);

  return {
    parentCommentId,
    sort,
    replies,
    hasMore: Boolean(moreToken),
    nextContinuation: moreToken,
  };
}

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

  const started = Date.now();
  let hitThreadWalkCap = false;

  try {
    const yt = await getInnertube();
    const contIn = continuationIn?.trim() || null;

    if (contIn) {
      const next = await watchNextContinuation(yt.actions, contIn);
      const out = repliesFromParsedResponse(next.data, parentCommentId, sort);
      cleantubeCommentsDebugLog("getWatchVideoCommentReplies:continuation", {
        videoId,
        parentCommentId,
        sort,
        ms: Date.now() - started,
        hitThreadWalkCap,
        ok: Boolean(out),
      });
      return out;
    }

    const { thread, hitThreadWalkCap: cappedWalk } = await findCommentThreadForParent(
      yt,
      videoId,
      sort,
      parentCommentId,
    );
    hitThreadWalkCap = cappedWalk;

    if (thread?.comment_replies_data?.contents) {
      const { ContinuationItemClass } = getYoutubeiInternals();
      const continuationNode = thread.comment_replies_data.contents.firstOfType(
        ContinuationItemClass as never,
      ) as { endpoint?: { call: (a: unknown, o?: unknown) => Promise<unknown> } } | undefined;
      if (continuationNode?.endpoint?.call) {
        try {
          const response = await continuationNode.endpoint.call(yt.actions, {
            parse: true,
          });
          const direct = repliesFromParsedResponse(response, parentCommentId, sort);
          if (direct) {
            cleantubeCommentsDebugLog("getWatchVideoCommentReplies:direct", {
              videoId,
              parentCommentId,
              sort,
              ms: Date.now() - started,
              hitThreadWalkCap,
              ok: true,
            });
            return direct;
          }
        } catch {
          /* fall through to legacy token path */
        }
      }
    }

    const cont = encodeCommentsSectionContinuation(videoId, sort);
    const section = await watchNextContinuation(yt.actions, cont);
    const raw = JSON.stringify(section.data);
    let token = extractInitialReplyContinuationToken(raw, parentCommentId);
    if (!token) {
      const idx = raw.indexOf(parentCommentId);
      if (idx >= 0) {
        const slice = raw.slice(Math.max(0, idx - 400), idx + 3200);
        const m = slice.match(
          /"continuationCommand":\s*\{[^}]*"token":\s*"([^"]+)"/,
        );
        token = m?.[1] ?? null;
      }
    }
    if (!token) {
      if (hitThreadWalkCap) {
        const limited: WatchVideoCommentReplies = {
          parentCommentId,
          sort,
          replies: [],
          hasMore: false,
          nextContinuation: null,
          fetchLimitedNote:
            "Replies could not be loaded because the parent comment is beyond the depth we scan in one request. Try the other sort order or open the thread on YouTube.",
        };
        cleantubeCommentsDebugLog("getWatchVideoCommentReplies:section-miss-capped", {
          videoId,
          parentCommentId,
          sort,
          ms: Date.now() - started,
          hitThreadWalkCap,
        });
        return limited;
      }
      cleantubeCommentsDebugLog("getWatchVideoCommentReplies:section-miss", {
        videoId,
        parentCommentId,
        sort,
        ms: Date.now() - started,
        hitThreadWalkCap,
      });
      return null;
    }

    const next = await watchNextContinuation(yt.actions, token);
    const parsed = repliesFromParsedResponse(next.data, parentCommentId, sort);
    cleantubeCommentsDebugLog("getWatchVideoCommentReplies:section", {
      videoId,
      parentCommentId,
      sort,
      ms: Date.now() - started,
      hitThreadWalkCap,
      ok: Boolean(parsed),
    });
    if (!parsed && hitThreadWalkCap) {
      return {
        parentCommentId,
        sort,
        replies: [],
        hasMore: false,
        nextContinuation: null,
        fetchLimitedNote:
          "Replies could not be parsed after loading the comment section. The thread may be too deep for one request—try the other sort or YouTube.",
      };
    }
    return parsed;
  } catch {
    cleantubeCommentsDebugLog("getWatchVideoCommentReplies:error", {
      videoId,
      parentCommentId,
      sort,
      ms: Date.now() - started,
      hitThreadWalkCap,
    });
    return null;
  }
}
