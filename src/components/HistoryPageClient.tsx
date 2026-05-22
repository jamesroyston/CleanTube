"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo } from "react";

import { WatchProgressBar } from "@/components/WatchProgressBar";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";
import { watchNavigationCaptureHandlers } from "@/lib/watchReturnNavigation";

function timestamp(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function HistoryPageClient() {
  const {
    watchProgress,
    getResumeSeconds,
    removeWatchProgressByVideoId,
    clearWatchProgress,
  } = useCloudLibrary();
  const orderedHistory = useMemo(
    () =>
      [...watchProgress].sort(
        (a, b) => timestamp(b.lastWatchedAt) - timestamp(a.lastWatchedAt),
      ),
    [watchProgress],
  );

  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700 }}>
              History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Watched videos are ordered by last watch time, with saved progress for resuming.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            disabled={orderedHistory.length === 0}
            onClick={clearWatchProgress}
          >
            Clear history
          </Button>
        </Stack>
        {orderedHistory.length === 0 ? (
          <Typography color="text.secondary">
            Your watch history will appear here once progress tracking starts.
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {orderedHistory.map((entry) => {
              const resume = getResumeSeconds(entry.videoId);
              const href =
                resume && resume > 0
                  ? `/watch/${entry.videoId}?t=${encodeURIComponent(String(resume))}`
                  : `/watch/${entry.videoId}`;

              return (
                <Card key={entry.videoId} variant="outlined">
                  <Stack direction={{ xs: "column", sm: "row" }} alignItems="stretch">
                    <Box
                      component={Link}
                      href={href}
                      {...watchNavigationCaptureHandlers()}
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
                        {...watchNavigationCaptureHandlers()}
                        variant="h6"
                        sx={{ color: "text.primary", fontWeight: 600, textDecoration: "none" }}
                      >
                        {entry.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {entry.channelName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last watched {new Date(entry.lastWatchedAt).toLocaleString()}
                      </Typography>
                      <WatchProgressBar
                        positionSeconds={entry.lastPositionSeconds}
                        durationSeconds={entry.durationSeconds}
                      />
                    </CardContent>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ p: 2, pt: { xs: 0, sm: 2 } }}
                      alignItems="center"
                    >
                      <Button component={Link} href={href} startIcon={<PlayArrowIcon />}>
                        Resume
                      </Button>
                      <IconButton
                        aria-label={`Remove ${entry.title} from history`}
                        color="error"
                        onClick={() => {
                          void removeWatchProgressByVideoId(entry.videoId);
                        }}
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
