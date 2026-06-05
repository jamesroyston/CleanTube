"use client";

import { useEffect, useRef } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import { useSwrInitialLoad } from "@/hooks/useSwrInitialLoad";
import { readFetchJson } from "@/lib/fetchJson";
import { clearSwrIdbCache } from "@/lib/swrIdbProvider";
import type { ForYouFeedResult } from "@/lib/forYou/types";

type ForYouApiResponse = ForYouFeedResult & {
  error?: string;
};

export type ForYouFeedKey = readonly ["for-you-feed", string];

async function fetchForYouFeed(
  [, userId]: ForYouFeedKey,
): Promise<ForYouFeedResult> {
  void userId;
  const response = await fetch("/api/for-you", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await readFetchJson<ForYouApiResponse>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load your feed.");
  }
  const sections = payload.sections ?? [];
  return {
    sections,
    empty:
      Boolean(payload.empty) &&
      (sections.every((section) => section.videos.length === 0) ?? true),
  };
}

type UseForYouFeedOptions = {
  userId: string | null | undefined;
  enabled: boolean;
};

export function useForYouFeed({ userId, enabled }: UseForYouFeedOptions) {
  const swrKey: ForYouFeedKey | null =
    userId && enabled ? (["for-you-feed", userId] as const) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    fetchForYouFeed,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
    },
  );

  const wasEnabledRef = useRef(false);
  useEffect(() => {
    if (enabled && userId && !wasEnabledRef.current) {
      void mutate();
    }
    wasEnabledRef.current = Boolean(enabled && userId);
  }, [enabled, userId, mutate]);

  return {
    sections: data?.sections ?? [],
    feedEmpty: data?.empty ?? false,
    feedError: error instanceof Error ? error.message : null,
    /** True only when there is no cached feed yet (not on revisit). */
    isInitialLoad: useSwrInitialLoad(isLoading, Boolean(data)),
    /** Background refetch while stale sections remain visible. */
    isRefreshing: isValidating && Boolean(data),
    refreshFeed: () => mutate(),
  };
}

/** Clear cached feed for all users (call on sign-out). */
export function clearForYouFeedCache(): void {
  void globalMutate(
    (key) => Array.isArray(key) && key[0] === "for-you-feed",
    undefined,
    { revalidate: false },
  );
  void clearSwrIdbCache();
}
