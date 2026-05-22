"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import {
  clearWatchReturnTarget,
  deriveWatchReturnTarget,
  setWatchReturnTarget,
} from "@/lib/watchReturnNavigation";

/**
 * Records the in-app path the user left before entering `/watch/[id]`,
 * so WatchBackLink can offer contextual back navigation.
 */
export function WatchReturnTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevFullPathRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const search = searchParams.toString();
    const current = search ? `${pathname}?${search}` : pathname;
    const isWatch = pathname.startsWith("/watch/");

    if (isWatch && prevFullPathRef.current) {
      const prev = prevFullPathRef.current;
      if (!prev.startsWith("/watch/")) {
        try {
          const prevUrl = new URL(prev, window.location.origin);
          const target = deriveWatchReturnTarget(
            prevUrl.pathname,
            prevUrl.search.startsWith("?")
              ? prevUrl.search.slice(1)
              : prevUrl.search,
          );
          if (target) {
            setWatchReturnTarget(target.href, target.label);
          } else {
            clearWatchReturnTarget();
          }
        } catch {
          clearWatchReturnTarget();
        }
      }
    }

    prevFullPathRef.current = current;
  }, [pathname, searchParams]);

  return null;
}
