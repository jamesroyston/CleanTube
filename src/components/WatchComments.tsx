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
import { useState } from "react";

import type {
  WatchVideoComments,
  WatchVideoCommentSort,
} from "@/lib/youtubeTypes";

type WatchCommentsProps = {
  videoId: string;
  initialComments: WatchVideoComments | null;
};

function authorHref(comment: WatchVideoComments["comments"][number]): string | undefined {
  if (comment.authorChannelId) {
    return `/channel/${encodeURIComponent(comment.authorChannelId)}`;
  }
  return comment.authorUrl;
}

type CommentsResponse = {
  comments?: WatchVideoComments;
  error?: string;
};

const authorLinkStyle = {
  color: "inherit",
  fontWeight: 700,
  textDecoration: "none",
};

export function WatchComments({
  videoId,
  initialComments,
}: WatchCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const entries = comments?.comments ?? [];
  const sort = comments?.sort ?? "top";
  const page = comments?.page ?? 1;

  function loadComments(nextSort: WatchVideoCommentSort, nextPage: number) {
    setError(null);
    setLoading(true);
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
            const href = authorHref(comment);
            return (
              <Paper key={comment.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar
                    src={comment.authorThumbnailUrl}
                    alt=""
                    sx={{ width: 36, height: 36 }}
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
                      {comment.replyCount ? (
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
                  </Box>
                </Stack>
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
