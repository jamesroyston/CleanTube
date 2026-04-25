import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { HomeHeroEmpty } from "@/components/HomeHeroEmpty";
import { LastSearchSync } from "@/components/LastSearchSync";
import { SearchSortBar } from "@/components/SearchSortBar";
import { VideoResultsGrid } from "@/components/VideoResultsGrid";
import {
  extractVideoIdFromUrl,
  isLikelyYouTubeUrl,
  searchVideos,
} from "@/lib/youtube";
import { extractStartSecondsFromYoutubeInput } from "@/lib/youtubeTime";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
  sortVideoSummariesByUploadDate,
} from "@/lib/uploadedAtSort";
import { toVideoSummaries } from "@/lib/serializeVideo";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    searchSort?: string;
    resultSort?: string;
    /** @deprecated legacy combined search/results sort param */
    sort?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const { q, searchSort: searchSortRaw, resultSort: resultSortRaw, sort: legacySortRaw } =
    await searchParams;
  const searchSortMode = normalizeSearchSortParam(searchSortRaw ?? legacySortRaw);
  const resultSortMode = normalizeResultSortParam(resultSortRaw ?? legacySortRaw);
  const query = q?.trim() ?? "";

  if (query && isLikelyYouTubeUrl(query)) {
    const fromUrl = extractVideoIdFromUrl(query);
    if (fromUrl) {
      const start = extractStartSecondsFromYoutubeInput(query);
      const qs =
        start != null && start > 0
          ? `?t=${encodeURIComponent(String(start))}`
          : "";
      redirect(`/watch/${fromUrl}${qs}`);
    }
  }

  let errorMessage: string | null = null;
  let videos = toVideoSummaries([]);

  if (query) {
    try {
      const results = await searchVideos(query, 24, searchSortMode);
      videos = sortVideoSummariesByUploadDate(
        toVideoSummaries(results),
        resultSortMode,
      );
    } catch {
      errorMessage = "Search could not be completed. Please try again.";
    }
  }

  return (
    <Box component="main" sx={{ pb: 6, minHeight: "100vh" }}>
      <Suspense fallback={null}>
        <LastSearchSync />
      </Suspense>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        {!query ? (
          <HomeHeroEmpty />
        ) : errorMessage ? (
          <Typography color="error" sx={{ py: 4 }}>
            {errorMessage}
          </Typography>
        ) : videos.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4 }}>
            No videos found for &ldquo;{query}&rdquo;.
          </Typography>
        ) : (
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
                About {videos.length} result{videos.length === 1 ? "" : "s"}{" "}
                for <strong>{query}</strong>
              </Typography>
              <SearchSortBar
                query={query}
                searchSort={searchSortMode}
                resultSort={resultSortMode}
              />
            </Box>
            <VideoResultsGrid videos={videos} />
          </>
        )}
      </Container>
    </Box>
  );
}
