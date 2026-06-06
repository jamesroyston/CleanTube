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

/**
 * True while there is no cached data yet and we are still waiting on IDB hydration
 * and/or the SWR fetch. Showing a skeleton during IDB hydration avoids a blank gap
 * before persisted cache merges; once data exists, cached UI renders immediately.
 */
export function useSwrInitialLoad(
  isLoading: boolean,
  hasData: boolean,
): boolean {
  const idbHydrated = useSwrIdbHydrated();
  return !hasData && (!idbHydrated || isLoading);
}
