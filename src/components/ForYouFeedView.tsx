"use client";

import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

import { LibrarySignInPrompt } from "@/components/LibrarySignInPrompt";
import type { VideoSummary } from "@/components/VideoSummary";
import {
  VideoCarouselRow,
  VideoCarouselRowSkeleton,
} from "@/components/VideoCarouselRow";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useForYouDismissed } from "@/hooks/useForYouDismissed";
import { useForYouFeed } from "@/hooks/useForYouFeed";
import { useSwrIdbHydrated } from "@/hooks/useSwrInitialLoad";
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

  /** Client auth wins after hydration; SSR prop can lag after passkey sign-in. */
  const effectiveSignedIn = signedIn || canPersistLibrary;

  const {
    sections: rawSections,
    feedEmpty: rawFeedEmpty,
    feedError,
    isInitialLoad,
    isRefreshing,
    feedStale,
    feedDayKey,
    refreshFeed,
  } = useForYouFeed({
    userId: user?.id,
    enabled: effectiveSignedIn && canPersistLibrary && libraryReady,
  });

  const [dismissedFeedDayKey, setDismissedFeedDayKey] = useState<string | null>(
    null,
  );

  const { dismissVideo, filterFeed } = useForYouDismissed(user?.id, {
    cloudEnabled: canPersistLibrary,
  });
  const { sections, empty: feedEmpty } = useMemo(
    () => filterFeed({ sections: rawSections, empty: rawFeedEmpty }),
    [filterFeed, rawFeedEmpty, rawSections],
  );

  const idbHydrated = useSwrIdbHydrated();
  const hasCachedFeed = sections.length > 0;

  const awaitingFeed =
    effectiveSignedIn && canPersistLibrary && !hasCachedFeed;
  const showFeedSkeleton =
    awaitingFeed &&
    (isInitialLoad || !libraryReady || (!idbHydrated && !hasCachedFeed));

  const hasSignals = forYouHasLibrarySignals(
    savedChannels,
    watchProgress,
    getRecentSearches(),
  );

  const showLibrarySyncSkeleton =
    effectiveSignedIn &&
    !hasCachedFeed &&
    !hasLibraryInMemory &&
    (authStatus !== "ready" ||
      !localLibraryHydrated ||
      (canPersistLibrary && libraryCloudSyncState === "syncing"));

  const showSignInPrompt = authStatus === "ready" && !canPersistLibrary;
  const showFreshPrompt =
    feedStale &&
    hasCachedFeed &&
    !isRefreshing &&
    dismissedFeedDayKey !== feedDayKey;
  const resolvedFeedError = feedError ?? initialError ?? null;
  const showContinueWatchingInSkeleton =
    showLibrarySyncSkeleton && continueWatchingVideos.length > 0;

  return (
    <>
      <Stack spacing={1} sx={{ mb: 3 }}>
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
          {effectiveSignedIn
            ? "Fresh picks from your watch history, saved channels, and searches — tap ··· on a card to hide one."
            : "Sign in to personalize this page with your library."}
        </Typography>
      </Stack>

      {showFreshPrompt ? (
        <Box sx={{ mb: 3 }}>
          <Chip
            color="primary"
            variant="filled"
            icon={<AutorenewRoundedIcon />}
            label="Fresh recommendations available — tap to update"
            onClick={() => void refreshFeed()}
            onDelete={() => setDismissedFeedDayKey(feedDayKey ?? null)}
            sx={{ maxWidth: "100%", height: "auto", py: 0.75, "& .MuiChip-label": { whiteSpace: "normal" } }}
          />
        </Box>
      ) : null}

      {showSignInPrompt ? (
        <LibrarySignInPrompt
          title="Sign in for your For You feed"
          message="Save channels, watch videos, and pin searches while signed in. Your feed is built from that library."
        />
      ) : (
        <>
          {!showLibrarySyncSkeleton && continueWatchingVideos.length > 0 ? (
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

          {showLibrarySyncSkeleton ? (
            <FeedSectionsSkeleton
              sectionCount={3}
              showContinueWatching={showContinueWatchingInSkeleton}
            />
          ) : libraryCloudSyncState === "error" && !hasCachedFeed ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Your library could not be synced. Recommendations may be
              unavailable; Continue watching uses videos from this device
              session.
            </Alert>
          ) : null}

          {!showLibrarySyncSkeleton ? (
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

              {showFeedSkeleton ? (
                <FeedSectionsSkeleton sectionCount={3} />
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
                        forYouMenu
                        onDismissFromForYou={dismissVideo}
                      />
                    </Box>
                  ))}
                </Stack>
              )}

              {effectiveSignedIn && libraryReady && !isInitialLoad ? (
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

const FOR_YOU_SKELETON_SECTION_COUNT = 3;

function FeedSectionsSkeleton({
  sectionCount = FOR_YOU_SKELETON_SECTION_COUNT,
  showContinueWatching = false,
}: {
  sectionCount?: number;
  showContinueWatching?: boolean;
}) {
  return (
    <Stack spacing={4}>
      {showContinueWatching ? (
        <Box>
          <Skeleton
            variant="text"
            height={32}
            sx={{ mb: 2, width: { xs: 180, sm: 220 } }}
          />
          <VideoCarouselRowSkeleton cardCount={4} />
        </Box>
      ) : null}
      {Array.from({ length: sectionCount }, (_, sectionIndex) => (
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
