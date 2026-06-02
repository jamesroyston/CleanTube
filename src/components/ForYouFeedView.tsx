"use client";

import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";

import { HomeHeroEmpty } from "@/components/HomeHeroEmpty";
import { LibrarySignInPrompt } from "@/components/LibrarySignInPrompt";
import type { VideoSummary } from "@/components/VideoSummary";
import {
  VideoCarouselRow,
  VideoCarouselRowSkeleton,
} from "@/components/VideoCarouselRow";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useForYouFeed } from "@/hooks/useForYouFeed";
import { forYouHasLibrarySignals } from "@/lib/forYou/recommendations";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";
import type { WatchProgressEntry } from "@/types/watchProgress";
import { formatYoutubeDurationSeconds } from "@/lib/youtubeiAdapters";

type ForYouFeedViewProps = {
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
    watchLaterEntries,
    inProgressEntries,
    getRecentSearches,
    user,
  } = useCloudLibrary();

  const continueWatchingVideos = useMemo(
    () => inProgressToVideoSummaries(inProgressEntries.slice(0, 8)),
    [inProgressEntries],
  );

  const hasLibraryInMemory =
    savedChannels.length > 0 ||
    watchProgress.length > 0 ||
    watchLaterEntries.length > 0;

  const libraryReady =
    localLibraryHydrated &&
    authStatus === "ready" &&
    (!canPersistLibrary ||
      libraryCloudSyncState === "synced" ||
      libraryCloudSyncState === "error" ||
      (libraryCloudSyncState === "syncing" && hasLibraryInMemory));

  const {
    sections,
    feedEmpty,
    feedError,
    isInitialLoad,
    isRefreshing,
    refreshFeed,
  } = useForYouFeed({
    userId: user?.id,
    enabled: signedIn && canPersistLibrary && libraryReady,
  });

  const hasCachedFeed = sections.length > 0;

  const hasSignals = forYouHasLibrarySignals(
    savedChannels,
    watchProgress,
    getRecentSearches(),
  );

  const showSyncSpinner =
    signedIn &&
    !hasCachedFeed &&
    !hasLibraryInMemory &&
    (authStatus !== "ready" ||
      !localLibraryHydrated ||
      (canPersistLibrary && libraryCloudSyncState === "syncing"));

  const showSignInPrompt = authStatus === "ready" && !canPersistLibrary;
  const showSignedOutLanding = !signedIn && showSignInPrompt;
  const resolvedFeedError = feedError ?? initialError ?? null;

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
          {isRefreshing ? (
            <CircularProgress size={16} sx={{ ml: 0.5 }} aria-label="Updating recommendations" />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {signedIn
            ? "Recommendations from your saved channels, watch history, and pinned searches."
            : "Sign in to personalize this page with your library."}
        </Typography>
      </Stack>

      {showSignInPrompt ? (
        <LibrarySignInPrompt
          title="Sign in for your For You feed"
          message="Save channels, watch videos, and pin searches while signed in. Your feed is built from that library."
        />
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
              <VideoCarouselRow
                videos={continueWatchingVideos}
                ariaLabel="Continue watching"
              />
            </Box>
          ) : null}

          {showSyncSpinner ? (
            <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Loading your library…
              </Typography>
            </Stack>
          ) : libraryCloudSyncState === "error" && !hasCachedFeed ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Your library could not be synced. Recommendations may be
              unavailable; Continue watching uses videos from this device
              session.
            </Alert>
          ) : null}

          {!showSyncSpinner ? (
            <>
              {resolvedFeedError && !hasCachedFeed ? (
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Alert severity="error">{resolvedFeedError}</Alert>
                  <Button
                    variant="outlined"
                    disabled={isInitialLoad || isRefreshing}
                    onClick={() => void refreshFeed()}
                  >
                    Try again
                  </Button>
                </Stack>
              ) : null}

              {resolvedFeedError && hasCachedFeed ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Could not refresh recommendations. Showing your last loaded
                  feed.
                </Alert>
              ) : null}

              {isInitialLoad ? (
                <FeedSectionsSkeleton />
              ) : !hasSignals && !hasCachedFeed ? (
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
                <Stack spacing={4} data-for-you-feed-ready>
                  {sections.map((section) => (
                    <Box key={section.id}>
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ fontWeight: 700, mb: 2 }}
                      >
                        {section.title}
                      </Typography>
                      <VideoCarouselRow
                        videos={section.videos}
                        ariaLabel={section.title}
                      />
                    </Box>
                  ))}
                </Stack>
              )}

              {signedIn && libraryReady && !isInitialLoad ? (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="text"
                    size="small"
                    disabled={isRefreshing}
                    onClick={() => void refreshFeed()}
                  >
                    Refresh recommendations
                  </Button>
                </Box>
              ) : null}
            </>
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
          <Skeleton
            variant="text"
            height={32}
            sx={{ mb: 2, width: { xs: 180, sm: 220 } }}
          />
          <VideoCarouselRowSkeleton cardCount={4} />
        </Box>
      ))}
    </Stack>
  );
}
