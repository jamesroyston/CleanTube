import { NextResponse } from "next/server";

import { pickBestGuessChannels } from "@/lib/channelSearchRelevance";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
  sortVideoSummariesByUploadDate,
  type SearchSortMode,
} from "@/lib/uploadedAtSort";
import { toVideoSummaries } from "@/lib/serializeVideo";
import { searchMixedResultsCached } from "@/lib/youtubeSearchCache";
import type { VideoSummary } from "@/components/VideoSummary";
import type { ChannelSearchResult } from "@/lib/youtubeTypes";

export const runtime = "nodejs";
export const maxDuration = 60;

export type SearchApiResponse = {
  query: string;
  channels: ChannelSearchResult[];
  videos: VideoSummary[];
  error?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const searchSort = normalizeSearchSortParam(
    searchParams.get("searchSort") ?? searchParams.get("sort"),
  );
  const resultSort = normalizeResultSortParam(
    searchParams.get("resultSort") ?? searchParams.get("sort"),
  );

  if (!query) {
    return NextResponse.json(
      { error: "Missing search query.", query: "", channels: [], videos: [] },
      { status: 400 },
    );
  }

  try {
    const results = await searchMixedResultsCached(query, 24, searchSort);
    const channels = pickBestGuessChannels(query, results.channels);
    const videos = sortVideoSummariesByUploadDate(
      toVideoSummaries(results.videos),
      resultSort,
    );
    return NextResponse.json({
      query,
      channels,
      videos,
    } satisfies SearchApiResponse);
  } catch (err) {
    console.error("[api/search]", err);
    const message =
      err instanceof Error ? err.message : "Search could not be completed.";
    return NextResponse.json(
      { error: message, query, channels: [], videos: [] },
      { status: 500 },
    );
  }
}
