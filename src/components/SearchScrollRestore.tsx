"use client";

import {
  applyScrollPosition,
  consumeScrollPosition,
  peekScrollPosition,
} from "@/lib/scrollRestoration";
import { useScrollContainer } from "@/context/ScrollContainerContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/**
 * Restores scroll position when returning to search results (back link or browser back).
 */
export function SearchScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getScrollElement } = useScrollContainer();
  const restoredKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (pathname !== "/") return;
    const q = searchParams.get("q")?.trim();
    if (!q) return;

    const search = searchParams.toString();
    const key = `${pathname}?${search}`;
    if (restoredKeyRef.current === key) return;

    const saved = peekScrollPosition(pathname, search);
    if (!saved) return;

    restoredKeyRef.current = key;

    let cancelled = false;
    const attemptRestore = (attempt: number) => {
      if (cancelled) return;
      const scrollElement = getScrollElement();
      const applied = applyScrollPosition(scrollElement, saved);
      if (applied || attempt >= 8) {
        consumeScrollPosition(pathname, search);
        return;
      }
      requestAnimationFrame(() => attemptRestore(attempt + 1));
    };

    attemptRestore(0);

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams, getScrollElement]);

  return null;
}
