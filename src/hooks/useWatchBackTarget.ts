"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import {
  getBackToSearchHref,
  getLastSearchQuery,
} from "@/lib/lastSearchSession";
import { getWatchReturnTarget } from "@/lib/watchReturnNavigation";

export type WatchBackTarget = {
  href: string;
  label: string;
};

export function resolveWatchBackTarget(): WatchBackTarget | null {
  const target = getWatchReturnTarget();
  if (target) return target;

  const q = getLastSearchQuery()?.trim();
  if (q) {
    return { href: getBackToSearchHref(), label: "Back to results" };
  }

  return null;
}

/** Contextual return target when viewing `/watch/[id]` (sessionStorage + last search). */
export function useWatchBackTarget(): WatchBackTarget | null {
  const pathname = usePathname();
  const isWatchPage = pathname.startsWith("/watch/");
  const [target, setTarget] = useState<WatchBackTarget | null>(null);

  const hydrate = useCallback(() => {
    if (!isWatchPage) {
      setTarget(null);
      return;
    }
    setTarget(resolveWatchBackTarget());
  }, [isWatchPage]);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate, pathname]);

  useEffect(() => {
    hydrate();
  }, [hydrate, pathname]);

  return isWatchPage ? target : null;
}
