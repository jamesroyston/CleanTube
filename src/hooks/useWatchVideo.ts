"use client";

import useSWR from "swr";

import type { WatchVideoApiResponse } from "@/app/api/videos/[id]/route";
import { useSwrInitialLoad } from "@/hooks/useSwrInitialLoad";
import { readFetchJson } from "@/lib/fetchJson";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";

export type WatchVideoKey = readonly ["watch-video", string];

async function fetchWatchVideo([, videoId]: WatchVideoKey): Promise<WatchVideoApiResponse> {
  const response = await fetch(`/api/videos/${encodeURIComponent(videoId)}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await readFetchJson<WatchVideoApiResponse>(response);
  if (!response.ok || !("video" in payload) || !payload.video) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Video could not be loaded.",
    );
  }
  return payload;
}

export function useWatchVideo(videoId: string) {
  const swrKey: WatchVideoKey = ["watch-video", videoId] as const;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    fetchWatchVideo,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  const video: WatchVideoDetails | null =
    data && "video" in data && data.video ? data.video : null;

  const isInitialLoad = useSwrInitialLoad(isLoading, Boolean(video));

  return {
    video,
    error: error instanceof Error ? error.message : null,
    isInitialLoad,
    isRefreshing: isValidating && Boolean(video),
    refresh: mutate,
  };
}
