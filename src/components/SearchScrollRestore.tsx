"use client";

import {
  applyScrollPosition,
  canApplyScrollPosition,
  consumeScrollPosition,
  isChannelGridReady,
  isForYouFeedReady,
  peekScrollPosition,
} from "@/lib/scrollRestoration";
import { useScrollContainer } from "@/context/ScrollContainerContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/**
 * Restores scroll position when returning to For You (`/`), search results (`/?q=…`),
 * or channel browse pages (`/channel/*`).
 */
export function SearchScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getScrollElement } = useScrollContainer();
  const restoredKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const isHome = pathname === "/";
    const isChannel = pathname.startsWith("/channel/");
    if (!isHome && !isChannel) return;

    const q = searchParams.get("q")?.trim();
    const isForYouHome = isHome && !q;
    const search = searchParams.toString();
    const key = `${pathname}?${search || ""}`;
    if (restoredKeyRef.current === key) return;

    const saved = peekScrollPosition(pathname, search);
    if (!saved) return;

    restoredKeyRef.current = key;

    const maxAttempts = isForYouHome || isChannel ? 20 : 8;
    let cancelled = false;

    const layoutReady = (scrollElement: HTMLElement | Window | null) => {
      if (isForYouHome) {
        return isForYouFeedReady() || canApplyScrollPosition(scrollElement, saved);
      }
      if (isChannel) {
        return isChannelGridReady() || canApplyScrollPosition(scrollElement, saved);
      }
      return canApplyScrollPosition(scrollElement, saved);
    };

    const attemptRestore = (attempt: number) => {
      if (cancelled) return;
      const scrollElement = getScrollElement();
      const ready = layoutReady(scrollElement);

      if (!ready && attempt < maxAttempts) {
        requestAnimationFrame(() => attemptRestore(attempt + 1));
        return;
      }

      const applied = applyScrollPosition(scrollElement, saved);
      if ((applied && ready) || attempt >= maxAttempts) {
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
