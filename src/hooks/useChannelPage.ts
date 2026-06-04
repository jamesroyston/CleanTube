"use client";

import { useMemo } from "react";
import useSWR from "swr";

import type { ChannelPageApiResponse } from "@/app/api/channel/[id]/route";
import {
  buildChannelPageCacheKey,
  readChannelPageCache,
  writeChannelPageCache,
} from "@/lib/channelPageClientCache";
import { readFetchJson } from "@/lib/fetchJson";
import type { ChannelSortMode, ChannelVideosPage } from "@/lib/youtubeTypes";

export type ChannelPageKey = readonly [
  "channel-page",
  string,
  ChannelSortMode,
  string,
];

function pageTokenKey(pageRaw?: string): string {
  return pageRaw?.trim() || "1";
}

async function fetchChannelPage([
  ,
  channelId,
  sort,
  pageToken,
]: ChannelPageKey): Promise<ChannelPageApiResponse> {
  const qs = new URLSearchParams();
  if (sort !== "latest") qs.set("sort", sort);
  if (pageToken !== "1") qs.set("page", pageToken);

  const query = qs.toString();
  const url = `/api/channel/${encodeURIComponent(channelId)}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await readFetchJson<ChannelPageApiResponse>(response);

  if ("redirect" in payload && payload.redirect) {
    return payload;
  }

  if (!response.ok || !("page" in payload) || !payload.page) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Channel could not be loaded.",
    );
  }

  writeChannelPageCache(
    buildChannelPageCacheKey({ channelId, sort, pageToken }),
    payload.page,
  );

  return payload;
}

type UseChannelPageOptions = {
  channelId: string;
  sort: ChannelSortMode;
  pageRaw?: string;
};

export function useChannelPage({
  channelId,
  sort,
  pageRaw,
}: UseChannelPageOptions) {
  const pageToken = pageTokenKey(pageRaw);
  const swrKey: ChannelPageKey = [
    "channel-page",
    channelId,
    sort,
    pageToken,
  ] as const;

  const sessionFallback = useMemo(
    () =>
      readChannelPageCache(
        buildChannelPageCacheKey({ channelId, sort, pageToken }),
      ),
    [channelId, sort, pageToken],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    fetchChannelPage,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData: sessionFallback
        ? ({ page: sessionFallback } satisfies ChannelPageApiResponse)
        : undefined,
    },
  );

  const page: ChannelVideosPage | null =
    data && "page" in data && data.page ? data.page : null;
  const redirect = data && "redirect" in data ? data.redirect : undefined;

  return {
    page,
    redirect,
    error: error instanceof Error ? error.message : null,
    isInitialLoad: isLoading && !page,
    isRefreshing: isValidating && Boolean(page),
    isSessionFallback: Boolean(sessionFallback && isValidating && page),
    refresh: mutate,
  };
}
