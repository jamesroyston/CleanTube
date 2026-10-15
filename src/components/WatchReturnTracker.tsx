"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

import {
  clearWatchReturnTarget,
  deriveWatchReturnTarget,
  setWatchReturnTarget,
} from "@/lib/watchReturnNavigation";

function watchIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/watch\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Records the in-app path the user left before entering `/watch/[id]`,
 * so the app bar can offer contextual back navigation on `/watch/[id]`.
 *
 * Also repairs iOS swipe-back when it skips Home: video A → Home → video B,
 * then swipe, can land on A instead of Home.
 */
export function WatchReturnTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const prevFullPathRef = useRef<string | null>(null);
  const poppingRef = useRef(false);
  const skipFromVideoIdRef = useRef<string | null>(null);
  const lastNonWatchRef = useRef("/");

  useEffect(() => {
    const onPop = () => {
      poppingRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    const search = searchParams.toString();
    const current = search ? `${pathname}?${search}` : pathname;
    const isWatch = pathname.startsWith("/watch/");
    const prev = prevFullPathRef.current;
    const popping = poppingRef.current;
    poppingRef.current = false;

    const prevWatchId = prev ? watchIdFromPath(prev.split("?")[0] ?? prev) : null;
    const currentWatchId = watchIdFromPath(pathname);

    if (
      popping &&
      prevWatchId &&
      currentWatchId &&
      prevWatchId !== currentWatchId &&
      skipFromVideoIdRef.current === currentWatchId
    ) {
      skipFromVideoIdRef.current = null;
      const href = lastNonWatchRef.current || "/";
      router.replace(href);
      prevFullPathRef.current = href;
      return;
    }

    if (prevWatchId && !currentWatchId) {
      skipFromVideoIdRef.current = prevWatchId;
      lastNonWatchRef.current = current;
    }

    if (isWatch && prev && !prev.startsWith("/watch/")) {
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

    prevFullPathRef.current = current;
  }, [pathname, searchParams, router]);

  return null;
}
