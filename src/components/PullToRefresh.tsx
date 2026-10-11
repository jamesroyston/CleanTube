"use client";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useScrollContainer } from "@/context/ScrollContainerContext";

/** Rendered pull distance (after resistance) that triggers a refresh. */
const THRESHOLD_PX = 70;
/** Asymptote of the resistance curve; the content never moves further. */
const MAX_PULL_PX = 140;
/** Where the content rests while the refresh promise runs. */
const HOLD_PX = 56;
/** Finger travel before the gesture direction is decided. */
const SLOP_PX = 10;
/** Downward travel must beat sideways travel by this factor to count as a pull. */
const VERTICAL_DOMINANCE = 1.5;
const INDICATOR_SIZE_PX = 40;
const SETTLE_MS = 220;
/** Keep the spinner up long enough to read as feedback on instant refreshes. */
const MIN_SPINNER_MS = 400;

const IGNORE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [data-pull-to-refresh-ignore]";

type Phase = "idle" | "pending" | "pulling" | "refreshing";

type PullToRefreshProps = {
  onRefresh: () => Promise<unknown> | unknown;
  disabled?: boolean;
  children: ReactNode;
};

function scrollTopOf(el: HTMLElement | Window): number {
  if (el === window) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return (el as HTMLElement).scrollTop;
}

function resist(dy: number): number {
  if (dy <= 0) return 0;
  return MAX_PULL_PX * (1 - Math.exp(-dy / MAX_PULL_PX));
}

/** A touch inside a nested vertical scroller that isn't at its top belongs to that scroller. */
function startsInScrolledRegion(
  target: EventTarget | null,
  root: HTMLElement,
): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== root) {
    if (
      node instanceof HTMLElement &&
      node.scrollTop > 0 &&
      node.scrollHeight > node.clientHeight
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function isWatchPath(pathname: string): boolean {
  return pathname === "/watch" || pathname.startsWith("/watch/");
}

/**
 * Touch pull-to-refresh for document-scrolled (mobile) and inner-scrolled
 * (desktop) pages. Only the wrapped content is translated, so the fixed bottom
 * nav and the sticky/fixed header never move, and document overscroll stays
 * disabled in globals.css.
 */
export function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
}: PullToRefreshProps) {
  const pathname = usePathname();
  const { getScrollElement } = useScrollContainer();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  const inactive = disabled || isWatchPath(pathname ?? "");

  useEffect(() => {
    const root = rootRef.current;
    if (inactive || !root) return;
    const scrollTarget: HTMLElement | Window = getScrollElement() ?? window;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let phase: Phase = "idle";
    let startX = 0;
    let startY = 0;
    let pull = 0;
    let moveListenerAttached = false;
    let disposed = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const paint = (distance: number, animate: boolean) => {
      const still = reducedMotion.matches;
      const transition =
        animate && !still
          ? `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0, 1), opacity ${SETTLE_MS}ms ease-out`
          : "none";
      const progress = Math.min(1, distance / THRESHOLD_PX);

      const content = contentRef.current;
      if (content) {
        content.style.transition = transition;
        content.style.transform =
          distance > 0 && !still ? `translate3d(0, ${distance}px, 0)` : "";
      }
      const indicator = indicatorRef.current;
      if (indicator) {
        const y = still ? 8 : (distance - INDICATOR_SIZE_PX) / 2;
        indicator.style.transition = transition;
        indicator.style.opacity = distance > 0 ? String(progress) : "0";
        indicator.style.transform = `translate3d(-50%, ${y}px, 0)`;
      }
      const icon = iconRef.current;
      if (icon) {
        icon.style.transform = still ? "" : `rotate(${progress * 270}deg)`;
      }
    };

    const setWillChange = (on: boolean) => {
      const value = on ? "transform" : "";
      if (contentRef.current) contentRef.current.style.willChange = value;
      if (indicatorRef.current) indicatorRef.current.style.willChange = value;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (phase !== "pending" && phase !== "pulling") return;
      if (event.touches.length !== 1) {
        settle();
        return;
      }
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (phase === "pending") {
        if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return;
        const pullingDown =
          dy >= SLOP_PX &&
          dy > Math.abs(dx) * VERTICAL_DOMINANCE &&
          scrollTopOf(scrollTarget) <= 0;
        if (!pullingDown) {
          phase = "idle";
          syncMoveListener();
          return;
        }
        phase = "pulling";
        setWillChange(true);
      }

      if (event.cancelable) event.preventDefault();
      pull = resist(dy - SLOP_PX);
      paint(pull, false);
    };

    /**
     * WebKit decides whether a gesture's touchmoves are cancelable from the
     * listeners present at touchstart, so the non-passive listener has to be
     * in place before the finger lands. It's only attached while the scroller
     * sits at the top (or a gesture is in flight); scrolled pages keep fully
     * passive touch handling.
     */
    function syncMoveListener() {
      const want = phase !== "idle" || scrollTopOf(scrollTarget) <= 0;
      if (want && !moveListenerAttached) {
        root!.addEventListener("touchmove", onTouchMove, { passive: false });
        moveListenerAttached = true;
      } else if (!want && moveListenerAttached) {
        root!.removeEventListener("touchmove", onTouchMove);
        moveListenerAttached = false;
      }
    }

    function settle() {
      phase = "idle";
      pull = 0;
      paint(0, true);
      syncMoveListener();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = null;
        if (phase === "idle") setWillChange(false);
      }, SETTLE_MS);
    }

    async function runRefresh() {
      phase = "refreshing";
      pull = HOLD_PX;
      paint(HOLD_PX, true);
      setRefreshing(true);
      const startedAt = performance.now();
      try {
        await onRefreshRef.current();
      } catch {
        /* the page surfaces its own fetch errors */
      }
      const remaining = MIN_SPINNER_MS - (performance.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      if (disposed) return;
      setRefreshing(false);
      settle();
    }

    const onTouchStart = (event: TouchEvent) => {
      if (phase === "pending" || phase === "pulling") {
        // Second finger: treat as pinch/zoom, not a pull.
        settle();
        return;
      }
      if (phase !== "idle" || event.touches.length !== 1) return;
      if (scrollTopOf(scrollTarget) > 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest(IGNORE_SELECTOR)) return;
      if (startsInScrolledRegion(target, root)) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      phase = "pending";
      syncMoveListener();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (phase === "pending") {
        phase = "idle";
        syncMoveListener();
        return;
      }
      if (phase !== "pulling") return;
      if (event.type === "touchend" && pull >= THRESHOLD_PX) {
        void runRefresh();
      } else {
        settle();
      }
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    scrollTarget.addEventListener("scroll", syncMoveListener, { passive: true });
    syncMoveListener();

    return () => {
      disposed = true;
      if (settleTimer) clearTimeout(settleTimer);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      root.removeEventListener("touchmove", onTouchMove);
      scrollTarget.removeEventListener("scroll", syncMoveListener);
      paint(0, false);
      setWillChange(false);
      setRefreshing(false);
    };
  }, [getScrollElement, inactive]);

  return (
    <Box ref={rootRef} sx={{ position: "relative" }}>
      <Box
        ref={indicatorRef}
        role="status"
        aria-live="polite"
        aria-hidden={!refreshing}
        sx={{
          position: "absolute",
          top: 0,
          left: "50%",
          zIndex: 1,
          width: INDICATOR_SIZE_PX,
          height: INDICATOR_SIZE_PX,
          borderRadius: "50%",
          bgcolor: "background.paper",
          color: "primary.main",
          boxShadow: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          opacity: 0,
          transform: `translate3d(-50%, ${-INDICATOR_SIZE_PX}px, 0)`,
        }}
      >
        {refreshing ? (
          <CircularProgress size={22} thickness={5} aria-label="Refreshing" />
        ) : (
          <Box ref={iconRef} sx={{ display: "flex" }}>
            <RefreshRoundedIcon fontSize="small" />
          </Box>
        )}
      </Box>
      <Box ref={contentRef}>{children}</Box>
    </Box>
  );
}
