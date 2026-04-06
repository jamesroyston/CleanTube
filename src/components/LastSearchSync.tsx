"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import {
  setLastSearchQuery,
  setLastSearchSort,
} from "@/lib/lastSearchSession";
import { normalizeSortParam } from "@/lib/uploadedAtSort";

/** Persists the active search query and sort so navigation and “back” keep the same URL shape. */
export function LastSearchSync() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim();
  const sortRaw = searchParams.get("sort");

  useEffect(() => {
    if (q) {
      setLastSearchQuery(q);
      setLastSearchSort(normalizeSortParam(sortRaw));
    }
  }, [q, sortRaw]);

  return null;
}
