"use client";

import {
  applyScrollPosition,
  canApplyScrollPosition,
  consumeScrollPosition,
  isChannelGridReady,
  isForYouFeedReady,
  peekScrollPosition,
  readCurrentScrollTop,
} from "@/lib/scrollRestoration";
import { useScrollContainer } from "@/context/ScrollContainerContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/**
 * How long to keep waiting for a streamed grid to grow tall enough to hold the
 * saved offset. A frame budget is not enough: the shell's own scroller has no
 * browser-native restore to fall back on, so giving up early lands the page
 * partway down a half-rendered grid.
 */
const RESTORE_BUDGET_MS = 1_500;
const FEED_RESTORE_BUDGET_MS = 2_500;
/** Sub-pixel rounding only; anything larger means the layout cannot hold it yet. */
const LANDED_TOLERANCE_PX = 2;

/**
 * Restores scroll position when returning to For You (`/`), search results (`/?q=…`),
 * or channel browse pages (`/channel/*`).
 */
export function SearchScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getScrollElement } = useScrollContainer();
  const restoredKeyRef = useRef<string | null>(null);
  /**
   * `useSearchParams()` hands back a new object on every render, and the page
   * re-renders constantly while results stream in. Depend on the serialized
   * query instead, or the cleanup tears the restore down a few frames in.
   */
  const search = searchParams.toString();

  useLayoutEffect(() => {
    const isHome = pathname === "/";
    const isChannel = pathname.startsWith("/channel/");
    if (!isHome && !isChannel) return;

    const q = new URLSearchParams(search).get("q")?.trim();
    const isForYouHome = isHome && !q;
    const key = `${pathname}?${search || ""}`;
    if (restoredKeyRef.current === key) return;

    const saved = peekScrollPosition(pathname, search);
    if (!saved) return;

    restoredKeyRef.current = key;

    const budgetMs =
      isForYouHome || isChannel ? FEED_RESTORE_BUDGET_MS : RESTORE_BUDGET_MS;
    const startedAt = performance.now();
    let cancelled = false;

    /** The reader taking over wins; stop yanking them back to the old offset. */
    const abort = () => {
      cancelled = true;
      consumeScrollPosition(pathname, search);
    };
    const abortEvents = ["wheel", "touchstart", "keydown"] as const;
    for (const type of abortEvents) {
      window.addEventListener(type, abort, { passive: true });
    }

    const layoutReady = (scrollElement: HTMLElement | Window | null) => {
      if (isForYouHome) {
        return isForYouFeedReady() || canApplyScrollPosition(scrollElement, saved);
      }
      if (isChannel) {
        return isChannelGridReady() || canApplyScrollPosition(scrollElement, saved);
      }
      return canApplyScrollPosition(scrollElement, saved);
    };

    const landed = (scrollElement: HTMLElement | Window | null) =>
      saved.videoId != null ||
      Math.abs(readCurrentScrollTop(scrollElement) - saved.scrollTop) <=
        LANDED_TOLERANCE_PX;

    const attemptRestore = () => {
      if (cancelled) return;
      const scrollElement = getScrollElement();
      const expired = performance.now() - startedAt >= budgetMs;

      /**
       * Re-apply every frame while the grid streams in so the view stays put
       * instead of drifting as rows are added above the saved offset.
       */
      const applied = applyScrollPosition(scrollElement, saved);

      if ((applied && layoutReady(scrollElement) && landed(scrollElement)) || expired) {
        consumeScrollPosition(pathname, search);
        return;
      }

      requestAnimationFrame(attemptRestore);
    };

    attemptRestore();

    return () => {
      cancelled = true;
      for (const type of abortEvents) {
        window.removeEventListener(type, abort);
      }
    };
  }, [pathname, search, getScrollElement]);

  return null;
}
