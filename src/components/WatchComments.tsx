"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import PushPinIcon from "@mui/icons-material/PushPin";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useState, type ReactNode } from "react";

import type { WatchVideoCommentReplies } from "@/lib/youtubeCommentReplies";
import type {
  WatchVideoComment,
  WatchVideoComments,
  WatchVideoCommentSort,
} from "@/lib/youtubeTypes";

type WatchCommentsProps = {
  videoId: string;
  initialComments: WatchVideoComments | null;
};

function authorHref(comment: WatchVideoComment): string | undefined {
  if (comment.authorChannelId) {
    return `/channel/${encodeURIComponent(comment.authorChannelId)}`;
  }
  return comment.authorUrl;
}

type CommentsResponse = {
  comments?: WatchVideoComments;
  error?: string;
};

type RepliesApiResponse = {
  replies?: WatchVideoCommentReplies;
  error?: string;
};

const authorLinkStyle = {
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
};

function parseReplyCountLabel(text: string | undefined): number {
  if (!text) return 0;
  const m = String(text).match(/(\d[\d,]*)/);
  if (!m) return 0;
  return Number.parseInt(m[1]!.replace(/,/g, ""), 10) || 0;
}

type ReplyThreadState = {
  open: boolean;
  items: WatchVideoComment[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  continuation: string | null;
};

const emptyThread = (): ReplyThreadState => ({
  open: false,
  items: [],
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: false,
  continuation: null,
});

type CommentBlockProps = {
  comment: WatchVideoComment;
  dense?: boolean;
  hideReplyMeta?: boolean;
  children?: ReactNode;
};

function CommentBlock({
  comment,
  dense = false,
  hideReplyMeta = false,
  children,
}: CommentBlockProps) {
  const href = authorHref(comment);
  const avatarSize = dense ? 28 : 36;
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar
        src={comment.authorThumbnailUrl}
        alt=""
        sx={{ width: avatarSize, height: avatarSize }}
      >
        {comment.authorName.slice(0, 1).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 0.5 }}
        >
          {href ? (
            href.startsWith("/") ? (
              <NextLink href={href} style={authorLinkStyle}>
                <Typography component="span" variant="body2">
                  {comment.authorName}
                </Typography>
              </NextLink>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={authorLinkStyle}
              >
                <Typography component="span" variant="body2">
                  {comment.authorName}
                </Typography>
              </a>
            )
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {comment.authorName}
            </Typography>
          )}
          {comment.publishedTime ? (
            <Typography variant="caption" color="text.secondary">
              {comment.publishedTime}
            </Typography>
          ) : null}
          {comment.pinned ? (
            <Chip
              size="small"
              icon={<PushPinIcon />}
              label="Pinned"
              variant="outlined"
            />
          ) : null}
          {comment.authorIsChannelOwner ? (
            <Chip size="small" label="Creator" variant="outlined" />
          ) : null}
        </Stack>

        <Typography
          variant="body2"
          sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
        >
          {comment.content}
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mt: 1 }}
        >
          {comment.likeCount ? (
            <Typography variant="caption" color="text.secondary">
              {comment.likeCount} likes
            </Typography>
          ) : null}
          {!hideReplyMeta && comment.replyCount ? (
            <Typography variant="caption" color="text.secondary">
              {comment.replyCount} replies
            </Typography>
          ) : null}
          {comment.hearted ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <FavoriteIcon color="error" sx={{ fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary">
                Hearted
              </Typography>
            </Stack>
          ) : null}
        </Stack>
        {children}
      </Box>
    </Stack>
  );
}

export function WatchComments({
  videoId,
  initialComments,
}: WatchCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyThreads, setReplyThreads] = useState<
    Record<string, ReplyThreadState>
  >({});

  const entries = comments?.comments ?? [];
  const sort = comments?.sort ?? "top";
  const page = comments?.page ?? 1;

  function loadComments(nextSort: WatchVideoCommentSort, nextPage: number) {
    setError(null);
    setLoading(true);
    setReplyThreads({});
    void (async () => {
      const qs = new URLSearchParams();
      qs.set("sort", nextSort);
      qs.set("page", String(nextPage));

      try {
        const response = await fetch(
          `/api/videos/${encodeURIComponent(videoId)}/comments?${qs.toString()}`,
        );
        const payload = (await response.json()) as CommentsResponse;
        if (!response.ok || !payload.comments) {
          throw new Error(payload.error || "Comments could not be loaded.");
        }
        setComments(payload.comments);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Comments could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }

  async function fetchReplies(
    parentId: string,
    continuation: string | null,
  ) {
    const qs = new URLSearchParams();
    qs.set("parent", parentId);
    qs.set("sort", sort);
    if (continuation) qs.set("continuation", continuation);

    const response = await fetch(
      `/api/videos/${encodeURIComponent(videoId)}/comments/replies?${qs.toString()}`,
    );
    const payload = (await response.json()) as RepliesApiResponse;
    if (!response.ok || !payload.replies) {
      throw new Error(payload.error || "Replies could not be loaded.");
    }
    return payload.replies;
  }

  function onToggleReplies(parentId: string) {
    const cur = replyThreads[parentId] ?? emptyThread();
    if (cur.open) {
      setReplyThreads((prev) => ({
        ...prev,
        [parentId]: { ...cur, open: false },
      }));
      return;
    }
    if (cur.items.length > 0) {
      setReplyThreads((prev) => ({
        ...prev,
        [parentId]: { ...cur, open: true },
      }));
      return;
    }
    setReplyThreads((prev) => ({
      ...prev,
      [parentId]: {
        ...(prev[parentId] ?? emptyThread()),
        open: true,
        loading: true,
        error: null,
      },
    }));
    void (async () => {
      try {
        const data = await fetchReplies(parentId, null);
        setReplyThreads((p) => ({
          ...p,
          [parentId]: {
            open: true,
            items: data.replies,
            loading: false,
            loadingMore: false,
            error: null,
            hasMore: data.hasMore,
            continuation: data.nextContinuation,
          },
        }));
      } catch (err) {
        setReplyThreads((p) => ({
          ...p,
          [parentId]: {
            ...emptyThread(),
            open: true,
            error:
              err instanceof Error
                ? err.message
                : "Replies could not be loaded.",
          },
        }));
      }
    })();
  }

  function onLoadMoreReplies(parentId: string) {
    const st = replyThreads[parentId];
    if (!st?.continuation) return;
    setReplyThreads((prev) => ({
      ...prev,
      [parentId]: { ...st, loadingMore: true, error: null },
    }));
    void (async () => {
      try {
        const data = await fetchReplies(parentId, st.continuation);
        setReplyThreads((p) => {
          const cur = p[parentId] ?? emptyThread();
          const merged = [...cur.items, ...data.replies].filter(
            (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
          );
          return {
            ...p,
            [parentId]: {
              ...cur,
              items: merged,
              loadingMore: false,
              hasMore: data.hasMore,
              continuation: data.nextContinuation,
            },
          };
        });
      } catch (err) {
        setReplyThreads((p) => ({
          ...p,
          [parentId]: {
            ...(p[parentId] ?? emptyThread()),
            loadingMore: false,
            error:
              err instanceof Error
                ? err.message
                : "More replies could not be loaded.",
          },
        }));
      }
    })();
  }

  return (
    <Box
      sx={{
        mt: 3,
        pt: 3,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            Comments
          </Typography>
          <ButtonGroup size="small" variant="outlined" aria-label="Comment sort">
            <Button
              disabled={loading}
              onClick={() => loadComments("top", 1)}
              variant={sort === "top" ? "contained" : "outlined"}
            >
              Top
            </Button>
            <Button
              disabled={loading}
              onClick={() => loadComments("newest", 1)}
              variant={sort === "newest" ? "contained" : "outlined"}
            >
              Newest
            </Button>
          </ButtonGroup>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {comments?.countText
            ? `${comments.countText} · showing ${sort === "newest" ? "newest" : "top"} comments`
            : `${sort === "newest" ? "Newest" : "Top"} comments from YouTube`}
        </Typography>
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Comments are unavailable for this video.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {entries.map((comment) => {
            const nReplies = parseReplyCountLabel(comment.replyCount);
            const thread = replyThreads[comment.id] ?? emptyThread();
            return (
              <Paper key={comment.id} variant="outlined" sx={{ p: 1.5 }}>
                <CommentBlock comment={comment}>
                  {nReplies > 0 ? (
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        size="small"
                        variant="text"
                        disabled={thread.loading}
                        onClick={() => onToggleReplies(comment.id)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {thread.loading
                          ? "Loading replies…"
                          : thread.open
                            ? "Hide replies"
                            : nReplies > 0
                              ? `View ${nReplies.toLocaleString()} repl${nReplies === 1 ? "y" : "ies"}`
                              : "View replies"}
                      </Button>
                    </Box>
                  ) : null}
                  {thread.open ? (
                    <Box
                      sx={{
                        mt: 1.5,
                        pl: 1.5,
                        borderLeft: 2,
                        borderColor: "divider",
                      }}
                    >
                      {thread.error ? (
                        <Typography variant="body2" color="error">
                          {thread.error}
                        </Typography>
                      ) : null}
                      {thread.loading &&
                      thread.items.length === 0 &&
                      !thread.error ? (
                        <Typography variant="body2" color="text.secondary">
                          Loading replies…
                        </Typography>
                      ) : null}
                      <Stack
                        spacing={1.25}
                        sx={{ mt: thread.error && !thread.items.length ? 1 : 0 }}
                      >
                        {thread.items.map((reply) => (
                          <CommentBlock
                            key={reply.id}
                            comment={reply}
                            dense
                            hideReplyMeta
                          />
                        ))}
                      </Stack>
                      {thread.hasMore && thread.continuation ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={thread.loadingMore}
                          onClick={() => onLoadMoreReplies(comment.id)}
                          sx={{ mt: 1, textTransform: "none" }}
                        >
                          {thread.loadingMore
                            ? "Loading…"
                            : "Show more replies"}
                        </Button>
                      ) : null}
                    </Box>
                  ) : null}
                </CommentBlock>
              </Paper>
            );
          })}
          {comments?.hasMore ? (
            <Button
              disabled={loading}
              onClick={() => loadComments(sort, page + 1)}
              variant="outlined"
              sx={{ alignSelf: "center" }}
            >
              {loading ? "Loading..." : "Load more comments"}
            </Button>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
