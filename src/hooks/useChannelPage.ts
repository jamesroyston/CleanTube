"use client";

import useSWR from "swr";

import type { ChannelPageApiResponse } from "@/app/api/channel/[id]/route";
import { useSwrInitialLoad } from "@/hooks/useSwrInitialLoad";
import { readFetchJson } from "@/lib/fetchJson";
import type { ChannelVideosPage } from "@/lib/youtubeTypes";

export type ChannelPageKey = readonly ["channel-page", string, string];

function pageTokenKey(pageRaw?: string): string {
  return pageRaw?.trim() || "1";
}

async function fetchChannelPage([
  ,
  channelId,
  pageToken,
]: ChannelPageKey): Promise<ChannelPageApiResponse> {
  const qs = new URLSearchParams();
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

  return payload;
}

type UseChannelPageOptions = {
  channelId: string;
  pageRaw?: string;
};

export function useChannelPage({ channelId, pageRaw }: UseChannelPageOptions) {
  const urlPageToken = pageTokenKey(pageRaw);
  const swrKey: ChannelPageKey = [
    "channel-page",
    channelId,
    urlPageToken,
  ] as const;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    fetchChannelPage,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const page: ChannelVideosPage | null =
    data && "page" in data && data.page ? data.page : null;
  const redirect = data && "redirect" in data ? data.redirect : undefined;
  const isPageSynced = !page || page.pageToken === urlPageToken;

  return {
    page,
    redirect,
    error: error instanceof Error ? error.message : null,
    urlPageToken,
    isPageSynced,
    isPageTransitioning: isValidating && Boolean(page) && !isPageSynced,
    isInitialLoad: useSwrInitialLoad(isLoading, Boolean(page)),
    isRefreshing: isValidating && Boolean(page) && isPageSynced,
    refresh: mutate,
  };
}
