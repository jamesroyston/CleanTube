"use client";

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
    generatedDayKey: payload.generatedDayKey,
  };
}

/** UTC day key, matching the server's `forYouDayKey` (kept inline to avoid
 * pulling server-only selection deps into the client bundle). */
function currentForYouDayKey(): string {
  return new Date().toISOString().slice(0, 10);
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
      // Stability on revisit: when a cached feed already exists, don't silently
      // refetch and reshuffle it under the user (the server re-ranks fresh
      // candidates, so a revalidation visibly changes recommendations). A genuine
      // cold start (empty cache, or expired 24h IndexedDB entry) still fetches,
      // and the "Refresh recommendations" button remains the explicit opt-in.
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000,
    },
  );

  return {
    sections: data?.sections ?? [],
    feedEmpty: data?.empty ?? false,
    feedError: error instanceof Error ? error.message : null,
    /** True only when there is no cached feed yet (not on revisit). */
    isInitialLoad: useSwrInitialLoad(isLoading, Boolean(data)),
    /** Background refetch while stale sections remain visible. */
    isRefreshing: isValidating && Boolean(data),
    /** Cached feed was generated on an earlier day; fresher picks are available
     * but we don't auto-swap — the UI offers an opt-in refresh instead. */
    feedStale: Boolean(
      data?.generatedDayKey && data.generatedDayKey !== currentForYouDayKey(),
    ),
    /** UTC day key the visible feed was generated for (for dismissal scoping). */
    feedDayKey: data?.generatedDayKey,
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
