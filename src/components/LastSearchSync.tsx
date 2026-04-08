"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { setLastSearchQuery } from "@/lib/lastSearchSession";

/** Persists the active search query so "Back" can return to the same results URL. */
export function LastSearchSync() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim();

  useEffect(() => {
    if (q) setLastSearchQuery(q);
  }, [q]);

  return null;
}
