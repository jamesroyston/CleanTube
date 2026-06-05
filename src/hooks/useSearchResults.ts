"use client";

import useSWR from "swr";

import type { SearchApiResponse } from "@/app/api/search/route";
import { useSwrInitialLoad } from "@/hooks/useSwrInitialLoad";
import { readFetchJson } from "@/lib/fetchJson";
import type { ResultSortMode, SearchSortMode } from "@/lib/uploadedAtSort";

export type SearchResultsKey = readonly [
  "search-results",
  string,
  SearchSortMode,
  ResultSortMode,
];

async function fetchSearchResults([
  ,
  query,
  searchSort,
  resultSort,
]: SearchResultsKey): Promise<SearchApiResponse> {
  const qs = new URLSearchParams({ q: query });
  if (searchSort !== "relevance") qs.set("searchSort", searchSort);
  if (resultSort !== "search") qs.set("resultSort", resultSort);

  const response = await fetch(`/api/search?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await readFetchJson<SearchApiResponse>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? "Search could not be completed.");
  }
  return payload;
}

type UseSearchResultsOptions = {
  query: string;
  searchSort: SearchSortMode;
  resultSort: ResultSortMode;
  enabled: boolean;
};

export function useSearchResults({
  query,
  searchSort,
  resultSort,
  enabled,
}: UseSearchResultsOptions) {
  const swrKey: SearchResultsKey | null = enabled
    ? (["search-results", query, searchSort, resultSort] as const)
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    fetchSearchResults,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 15_000,
    },
  );

  return {
    channels: data?.channels ?? [],
    videos: data?.videos ?? [],
    error: error instanceof Error ? error.message : null,
    isInitialLoad: useSwrInitialLoad(isLoading, Boolean(data)),
    isRefreshing: isValidating && Boolean(data),
    refresh: mutate,
  };
}
