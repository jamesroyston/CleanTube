"use client";

import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";

import { HomeHeroEmpty } from "@/components/HomeHeroEmpty";
import { LibrarySignInPrompt } from "@/components/LibrarySignInPrompt";
import type { VideoSummary } from "@/components/VideoSummary";
import { VideoResultsGrid } from "@/components/VideoResultsGrid";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { readFetchJson } from "@/lib/fetchJson";
import { forYouHasLibrarySignals } from "@/lib/forYou/recommendations";
import type { ForYouSection } from "@/lib/forYou/types";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";
import type { WatchProgressEntry } from "@/types/watchProgress";
import { formatYoutubeDurationSeconds } from "@/lib/youtubeiAdapters";

type ForYouApiResponse = {
  sections?: ForYouSection[];
  empty?: boolean;
  error?: string;
};

type ForYouFeedViewProps = {
  initialSections: ForYouSection[];
  initialEmpty: boolean;
  signedIn: boolean;
  initialError?: string;
};

function inProgressToVideoSummaries(entries: WatchProgressEntry[]): VideoSummary[] {
  return entries.map((entry) => ({
    id: entry.videoId,
    title: entry.title,
    thumbnailUrl: entry.thumbnailUrl,
    thumbnailFallbackUrls: youtubeThumbnailFallbackUrls(
      entry.videoId,
      undefined,
      entry.thumbnailUrl,
    ),
    channelName: entry.channelName,
    durationFormatted:
      formatYoutubeDurationSeconds(entry.durationSeconds) || "—",
    live: false,
  }));
}

export function ForYouFeedView({
  initialSections,
  initialEmpty,
  signedIn,
  initialError,
}: ForYouFeedViewProps) {
  const {
    canPersistLibrary,
    authStatus,
    localLibraryHydrated,
    libraryCloudSyncState,
    savedChannels,
    watchProgress,
    inProgressEntries,
    getRecentSearches,
  } = useCloudLibrary();

  const continueWatchingVideos = useMemo(
    () => inProgressToVideoSummaries(inProgressEntries.slice(0, 8)),
    [inProgressEntries],
  );

  const [sections, setSections] = useState(initialSections);
  const [feedEmpty, setFeedEmpty] = useState(initialEmpty);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(initialError ?? null);

  const libraryReady =
    localLibraryHydrated &&
    authStatus === "ready" &&
    (!canPersistLibrary || libraryCloudSyncState === "synced");

  const hasSignals = forYouHasLibrarySignals(
    savedChannels,
    watchProgress,
    getRecentSearches(),
  );

  const refreshFeed = useCallback(async () => {
    if (!canPersistLibrary) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const response = await fetch("/api/for-you", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const text = await response.text();
      if (!text.trim()) {
        throw new Error(
          `Empty response from server (${response.status}). Please try again.`,
        );
      }
      let payload: ForYouApiResponse;
      try {
        payload = JSON.parse(text) as ForYouApiResponse;
      } catch {
        throw new Error(
          response.ok
            ? "Could not read JSON from server."
            : `Unexpected server response (${response.status}). Please try again.`,
        );
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load your feed.");
      }
      setSections(payload.sections ?? []);
      setFeedEmpty(
        Boolean(payload.empty) &&
          (payload.sections?.every((s) => s.videos.length === 0) ?? true),
      );
    } catch (err) {
      setFeedError(
        err instanceof Error ? err.message : "Could not load your feed.",
      );
    } finally {
      setFeedLoading(false);
    }
  }, [canPersistLibrary]);

  const showSyncSpinner =
    signedIn &&
    canPersistLibrary &&
    (authStatus !== "ready" ||
      !localLibraryHydrated ||
      libraryCloudSyncState === "syncing");

  const showSignedOutLanding = !signedIn && !canPersistLibrary;

  return (
    <>
      {showSignedOutLanding ? (
        <HomeHeroEmpty />
      ) : null}

      <Stack spacing={1} sx={{ mb: 3, mt: showSignedOutLanding ? 4 : 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <DynamicFeedOutlinedIcon color="primary" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            For You
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {signedIn
            ? "Recommendations from your saved channels, watch history, and pinned searches."
            : "Sign in to personalize this page with your library."}
        </Typography>
      </Stack>

      {!canPersistLibrary ? (
        <LibrarySignInPrompt
          title="Sign in for your For You feed"
          message="Save channels, watch videos, and pin searches while signed in. Your feed is built from that library."
        />
      ) : showSyncSpinner ? (
        <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Loading your library…
          </Typography>
        </Stack>
      ) : libraryCloudSyncState === "error" ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Your library could not be synced. Try again after refreshing.
        </Alert>
      ) : (
        <>
          {continueWatchingVideos.length > 0 ? (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{ fontWeight: 700, mb: 2 }}
              >
                Continue watching
              </Typography>
              <VideoResultsGrid videos={continueWatchingVideos} />
            </Box>
          ) : null}

          {feedError ? (
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Alert severity="error">{feedError}</Alert>
              <Button
                variant="outlined"
                disabled={feedLoading}
                onClick={() => void refreshFeed()}
              >
                Try again
              </Button>
            </Stack>
          ) : null}

          {feedLoading ? (
            <FeedSectionsSkeleton />
          ) : !hasSignals ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              Save channels from a channel page, watch a few videos, or pin a
              search to start building your feed.
            </Typography>
          ) : feedEmpty || sections.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              We could not find new recommendations right now. Watch more or
              save another channel, then refresh.
            </Typography>
          ) : (
            <Stack spacing={4}>
              {sections.map((section) => (
                <Box key={section.id}>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 700, mb: 2 }}
                  >
                    {section.title}
                  </Typography>
                  <VideoResultsGrid videos={section.videos} />
                </Box>
              ))}
            </Stack>
          )}

          {signedIn && libraryReady && !feedLoading ? (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="text"
                size="small"
                disabled={feedLoading}
                onClick={() => void refreshFeed()}
              >
                Refresh recommendations
              </Button>
            </Box>
          ) : null}
        </>
      )}
    </>
  );
}

function FeedSectionsSkeleton() {
  return (
    <Stack spacing={4}>
      {Array.from({ length: 2 }, (_, sectionIndex) => (
        <Box key={sectionIndex}>
          <Skeleton variant="text" width={220} height={32} sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                sx={{ aspectRatio: "16 / 9", width: "100%" }}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
