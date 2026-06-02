"use client";

import SearchIcon from "@mui/icons-material/Search";
import Fab from "@mui/material/Fab";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useRef } from "react";

import { useSearchChrome } from "@/context/SearchChromeContext";

/** Below this scroll offset, the in-flow header is the primary chrome. */
const SCROLL_UP_THRESHOLD_PX = 80;
/** Deactivate overlay mode when scrolling back near the top. */
const SCROLL_DOWN_DEACTIVATE_PX = 40;
/** Scroll-up distance (px) for a fully revealed header overlay. */
const REVEAL_DISTANCE_PX = 88;
const FAB_SCROLL_THRESHOLD_PX = 320;
/** Hide the revealed header after idle scroll time when not at top. */
const AUTO_HIDE_MS = 3_000;
const IDLE_HIDE_MS = 300;
/** Lerp factor per frame for display progress toward target. */
const DISPLAY_LERP = 0.16;
const SCROLL_SETTLE_MS = 120;

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeInOut(t: number): number {
  return (1 - Math.cos(t * Math.PI)) / 2;
}

export function MobileSearchChrome() {
  const theme = useTheme();
  const mobile = useMediaQuery("(max-width:899.95px)");
  /** Match Header `static` breakpoints — skip when the bar is already sticky. */
  const headerScrollsAway = useMediaQuery(
    "(max-width:599.95px), (max-width:899.95px) and (orientation: landscape)",
  );
  const {
    openSearchOverlay,
    setMobileHeaderRevealProgress,
    setMobileHeaderOverlayMode,
    setMobileHeaderScrollSettled,
  } = useSearchChrome();
  const lastScrollYRef = useRef(0);
  const targetProgressRef = useRef(0);
  const displayProgressRef = useRef(0);
  const overlayModeActiveRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const idleHideFrameRef = useRef<number | null>(null);
  const smoothFrameRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);
  const showFabRef = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobile || !headerScrollsAway) {
      targetProgressRef.current = 0;
      displayProgressRef.current = 0;
      setMobileHeaderRevealProgress(0);
      setMobileHeaderOverlayMode(false);
      setMobileHeaderScrollSettled(true);
      return;
    }

    let ticking = false;

    function clearHideTimer() {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    function cancelIdleHide() {
      if (idleHideFrameRef.current != null) {
        cancelAnimationFrame(idleHideFrameRef.current);
        idleHideFrameRef.current = null;
      }
    }

    function cancelSmoothLoop() {
      if (smoothFrameRef.current != null) {
        cancelAnimationFrame(smoothFrameRef.current);
        smoothFrameRef.current = null;
      }
    }

    function clearScrollSettleTimer() {
      if (scrollSettleTimerRef.current != null) {
        window.clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = null;
      }
    }

    function markScrolling() {
      setMobileHeaderScrollSettled(false);
      clearScrollSettleTimer();
      scrollSettleTimerRef.current = window.setTimeout(() => {
        scrollSettleTimerRef.current = null;
        setMobileHeaderScrollSettled(true);
      }, SCROLL_SETTLE_MS);
    }

    function publishDisplayProgress(next: number) {
      const clamped = clampProgress(next);
      if (Math.abs(clamped - displayProgressRef.current) < 0.002) return;
      displayProgressRef.current = clamped;
      setMobileHeaderRevealProgress(clamped);
    }

    function setTargetProgress(next: number) {
      targetProgressRef.current = clampProgress(next);
    }

    function ensureSmoothLoop() {
      if (smoothFrameRef.current != null) return;

      const step = () => {
        const target = targetProgressRef.current;
        const display = displayProgressRef.current;
        const next = display + (target - display) * DISPLAY_LERP;
        publishDisplayProgress(next);

        const settled =
          Math.abs(target - displayProgressRef.current) < 0.002 &&
          idleHideFrameRef.current == null;
        if (settled && Math.abs(target) < 0.002) {
          smoothFrameRef.current = null;
          return;
        }

        smoothFrameRef.current = requestAnimationFrame(step);
      };

      smoothFrameRef.current = requestAnimationFrame(step);
    }

    function idleHideHeader() {
      cancelIdleHide();
      const start = targetProgressRef.current;
      if (start <= 0) return;
      const startTime = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / IDLE_HIDE_MS);
        setTargetProgress(start * (1 - easeInOut(t)));
        ensureSmoothLoop();
        if (t < 1) {
          idleHideFrameRef.current = requestAnimationFrame(step);
        } else {
          idleHideFrameRef.current = null;
          setTargetProgress(0);
        }
      };

      idleHideFrameRef.current = requestAnimationFrame(step);
    }

    function scheduleHide() {
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null;
        if (window.scrollY > SCROLL_UP_THRESHOLD_PX) {
          idleHideHeader();
        }
      }, AUTO_HIDE_MS);
    }

    function setFabVisible(visible: boolean) {
      if (showFabRef.current === visible) return;
      showFabRef.current = visible;
      const fab = fabRef.current;
      if (!fab) return;
      fab.style.display = visible ? "flex" : "none";
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        cancelIdleHide();
        markScrolling();
        const y = window.scrollY;
        const delta = y - lastScrollYRef.current;

        setFabVisible(y > FAB_SCROLL_THRESHOLD_PX);

        const shouldActivateOverlayMode =
          y > SCROLL_UP_THRESHOLD_PX ||
          (overlayModeActiveRef.current && y > SCROLL_DOWN_DEACTIVATE_PX);

        if (!shouldActivateOverlayMode) {
          overlayModeActiveRef.current = false;
          clearHideTimer();
          setMobileHeaderOverlayMode(false);
          setTargetProgress(0);
        } else {
          overlayModeActiveRef.current = true;
          setMobileHeaderOverlayMode(true);

          if (delta < 0) {
            setTargetProgress(
              targetProgressRef.current + -delta / REVEAL_DISTANCE_PX,
            );
            scheduleHide();
          } else if (delta > 0) {
            setTargetProgress(
              targetProgressRef.current - delta / REVEAL_DISTANCE_PX,
            );
            if (targetProgressRef.current <= 0) {
              clearHideTimer();
            } else {
              scheduleHide();
            }
          } else if (targetProgressRef.current > 0) {
            scheduleHide();
          }
        }

        ensureSmoothLoop();
        lastScrollYRef.current = y;
        ticking = false;
      });
    }

    lastScrollYRef.current = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearHideTimer();
      cancelIdleHide();
      cancelSmoothLoop();
      clearScrollSettleTimer();
      overlayModeActiveRef.current = false;
      targetProgressRef.current = 0;
      displayProgressRef.current = 0;
      setMobileHeaderRevealProgress(0);
      setMobileHeaderOverlayMode(false);
      setMobileHeaderScrollSettled(true);
    };
  }, [
    mobile,
    headerScrollsAway,
    setMobileHeaderRevealProgress,
    setMobileHeaderOverlayMode,
    setMobileHeaderScrollSettled,
  ]);

  if (!mobile) return null;

  const chromeZ = theme.zIndex.modal - 1;

  return (
    <Fab
      ref={fabRef}
      color="primary"
      aria-label="Open search"
      onClick={openSearchOverlay}
      sx={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: chromeZ,
        display: "none",
      }}
    >
      <SearchIcon />
    </Fab>
  );
}
