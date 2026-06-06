import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ForYouHome } from "@/components/ForYouHome";
import { ForYouPageFallback } from "@/components/ForYouPageFallback";
import { HomeSearchResultsClient } from "@/components/HomeSearchResultsClient";
import { LastSearchSync } from "@/components/LastSearchSync";
import { SearchScrollRestore } from "@/components/SearchScrollRestore";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
  extractVideoIdFromUrl,
  isLikelyYouTubeUrl,
} from "@/lib/youtube";
import { extractStartSecondsFromYoutubeInput } from "@/lib/youtubeTime";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
} from "@/lib/uploadedAtSort";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    searchSort?: string;
    resultSort?: string;
    /** @deprecated legacy combined search/results sort param */
    sort?: string;
  }>;
};

function HomeFallback() {
  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <ForYouPageFallback />
      </Container>
    </Box>
  );
}

async function HomeContent({ searchParams }: PageProps) {
  const {
    q,
    searchSort: searchSortRaw,
    resultSort: resultSortRaw,
    sort: legacySortRaw,
  } = await searchParams;
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
    const channelToken = extractChannelRouteTokenFromUrl(query);
    if (channelToken) {
      redirect(channelPageHrefFromToken(channelToken));
    }
  }

  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Suspense fallback={null}>
        <LastSearchSync />
        <SearchScrollRestore />
      </Suspense>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        {!query ? (
          <ForYouHome />
        ) : (
          <HomeSearchResultsClient
            query={query}
            searchSort={searchSortMode}
            resultSort={resultSortMode}
          />
        )}
      </Container>
    </Box>
  );
}

export default function Home(props: PageProps) {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent {...props} />
    </Suspense>
  );
}
