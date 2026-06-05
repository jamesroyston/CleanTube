"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { SearchResultsGrid } from "@/components/SearchResultsGrid";
import { SearchSortBar } from "@/components/SearchSortBar";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { VideoCardGridSkeleton } from "@/components/skeletons/VideoCardGridSkeleton";
import { useSearchResults } from "@/hooks/useSearchResults";
import type { ResultSortMode, SearchSortMode } from "@/lib/uploadedAtSort";

type HomeSearchResultsClientProps = {
  query: string;
  searchSort: SearchSortMode;
  resultSort: ResultSortMode;
};

function SearchResultsSkeleton() {
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Skeleton
          variant="text"
          sx={{ flex: "1 1 200px", minWidth: 0, height: 20 }}
        />
        <Skeleton variant="rounded" width={120} height={36} />
        <Skeleton variant="rounded" width={200} height={36} />
      </Box>
      <VideoCardGridSkeleton count={8} channelCount={2} />
    </Stack>
  );
}

export function HomeSearchResultsClient({
  query,
  searchSort,
  resultSort,
}: HomeSearchResultsClientProps) {
  const { channels, videos, error, isInitialLoad } = useSearchResults({
    query,
    searchSort,
    resultSort,
    enabled: true,
  });

  if (isInitialLoad) {
    return <SearchResultsSkeleton />;
  }

  if (error) {
    return (
      <Typography color="error" sx={{ py: 4 }}>
        {error}
      </Typography>
    );
  }

  const total = channels.length + videos.length;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flex: "1 1 200px", minWidth: 0, pt: 0.5 }}
        >
          About {total} result{total === 1 ? "" : "s"} for <strong>{query}</strong>
        </Typography>
        <SaveSearchButton query={query} />
        <SearchSortBar
          query={query}
          searchSort={searchSort}
          resultSort={resultSort}
        />
      </Box>
      {total === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          No videos found for &ldquo;{query}&rdquo;.
        </Typography>
      ) : (
        <SearchResultsGrid channels={channels} videos={videos} />
      )}
    </>
  );
}
