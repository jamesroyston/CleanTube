"use client";

import { useEffect, useState } from "react";

import { getSwrIdbHydrationPromise, isSwrIdbHydrated } from "@/lib/swrIdbProvider";

/**
 * True once IndexedDB-backed SWR entries are merged into the in-memory cache.
 * Avoids skeleton flashes on revisit while hydration is still in flight.
 */
export function useSwrIdbHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    typeof window === "undefined" ? true : isSwrIdbHydrated(),
  );

  useEffect(() => {
    if (isSwrIdbHydrated()) {
      setHydrated(true);
      return;
    }
    void getSwrIdbHydrationPromise().then(() => setHydrated(true));
  }, []);

  return hydrated;
}

/** Gate route skeletons until IDB hydration completes and SWR has no cached data yet. */
export function useSwrInitialLoad(
  isLoading: boolean,
  hasData: boolean,
): boolean {
  const idbHydrated = useSwrIdbHydrated();
  return idbHydrated && isLoading && !hasData;
}
