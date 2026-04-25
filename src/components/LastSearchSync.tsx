"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import {
  setLastResultSort,
  setLastSearchQuery,
  setLastSearchSort,
} from "@/lib/lastSearchSession";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
} from "@/lib/uploadedAtSort";

/** Persists the active search query and sort so navigation and “back” keep the same URL shape. */
export function LastSearchSync() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim();
  const legacySortRaw = searchParams.get("sort");
  const searchSortRaw = searchParams.get("searchSort") ?? legacySortRaw;
  const resultSortRaw = searchParams.get("resultSort") ?? legacySortRaw;

  useEffect(() => {
    if (q) {
      setLastSearchQuery(q);
      setLastSearchSort(normalizeSearchSortParam(searchSortRaw));
      setLastResultSort(normalizeResultSortParam(resultSortRaw));
    }
  }, [q, resultSortRaw, searchSortRaw]);

  return null;
}
