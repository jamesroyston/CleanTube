"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";

import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useWatchLater } from "@/context/WatchLaterContext";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";

type SortMode = "newest" | "oldest";

function timestamp(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function formatStartLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}:${String(r).padStart(2, "0")}`;
  return `${s}s`;
}

export function WatchLaterPageClient() {
  const { entries, removeByVideoId, clearEntries } = useWatchLater();
  const { getResumeSeconds } = useCloudLibrary();
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        sortMode === "newest"
          ? timestamp(b.addedAt) - timestamp(a.addedAt)
          : timestamp(a.addedAt) - timestamp(b.addedAt),
      ),
    [entries, sortMode],
  );

  function handleSortChange(event: SelectChangeEvent) {
    setSortMode(event.target.value as SortMode);
  }

  return (
    <Box component="main" sx={{ pb: 6, minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700 }}>
              Watch Later
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sort your queued videos by added date and remove anything you no longer need.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="watch-later-sort-label">Sort by</InputLabel>
              <Select
                labelId="watch-later-sort-label"
                value={sortMode}
                label="Sort by"
                onChange={handleSortChange}
              >
                <MenuItem value="newest">Newest added</MenuItem>
                <MenuItem value="oldest">Oldest added</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="error"
              disabled={entries.length === 0}
              onClick={clearEntries}
            >
              Clear all
            </Button>
          </Stack>
        </Stack>

        {sortedEntries.length === 0 ? (
          <Typography color="text.secondary">
            Add videos from search results or the watch page and they will appear here.
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {sortedEntries.map((entry) => {
              const resume = getResumeSeconds(entry.videoId, entry.startSeconds);
              const href =
                resume && resume > 0
                  ? `/watch/${entry.videoId}?t=${encodeURIComponent(String(resume))}`
                  : `/watch/${entry.videoId}`;

              return (
                <Card key={entry.entryId} variant="outlined">
                  <Stack direction={{ xs: "column", sm: "row" }} alignItems="stretch">
                    <Box
                      component={Link}
                      href={href}
                      sx={{
                        width: { xs: "100%", sm: 220 },
                        minWidth: { sm: 220 },
                        bgcolor: "action.hover",
                      }}
                    >
                      <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
                        <YouTubeThumbnailImage
                          src={entry.thumbnailUrl}
                          fallbacks={youtubeThumbnailFallbackUrls(
                            entry.videoId,
                            undefined,
                            entry.thumbnailUrl,
                          )}
                          alt=""
                          fill
                          sizes="220px"
                          style={{ objectFit: "cover" }}
                        />
                      </Box>
                    </Box>
                    <CardContent sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        component={Link}
                        href={href}
                        variant="h6"
                        sx={{ color: "text.primary", fontWeight: 600, textDecoration: "none" }}
                      >
                        {entry.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {entry.channelName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Added {new Date(entry.addedAt).toLocaleString()}
                        {entry.startSeconds != null && entry.startSeconds > 0
                          ? ` · Starts at ${formatStartLabel(entry.startSeconds)}`
                          : ""}
                      </Typography>
                    </CardContent>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ p: 2, pt: { xs: 0, sm: 2 } }}
                      alignItems="center"
                    >
                      <Button component={Link} href={href} startIcon={<PlayArrowIcon />}>
                        Play
                      </Button>
                      <IconButton
                        aria-label={`Remove ${entry.title}`}
                        color="error"
                        onClick={() => removeByVideoId(entry.videoId)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
