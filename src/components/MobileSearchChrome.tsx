"use client";

import SearchIcon from "@mui/icons-material/Search";
import Fab from "@mui/material/Fab";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useRef } from "react";

import { useSearchChrome } from "@/context/SearchChromeContext";

/** Below this scroll offset, the in-flow header is the primary chrome. */
const SCROLL_UP_THRESHOLD_PX = 80;
/** Scroll-up distance (px) for a fully revealed header overlay. */
const REVEAL_DISTANCE_PX = 56;
const FAB_SCROLL_THRESHOLD_PX = 320;
/** Hide the revealed header after idle scroll time when not at top. */
const AUTO_HIDE_MS = 3_000;
const IDLE_HIDE_MS = 180;

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
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
  } = useSearchChrome();
  const lastScrollYRef = useRef(0);
  const revealProgressRef = useRef(0);
  const overlayModeActiveRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const idleHideFrameRef = useRef<number | null>(null);
  const showFabRef = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobile || !headerScrollsAway) {
      revealProgressRef.current = 0;
      setMobileHeaderRevealProgress(0);
      setMobileHeaderOverlayMode(false);
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

    function setProgress(next: number) {
      const clamped = clampProgress(next);
      if (Math.abs(clamped - revealProgressRef.current) < 0.002) return;
      revealProgressRef.current = clamped;
      setMobileHeaderRevealProgress(clamped);
    }

    function idleHideHeader() {
      cancelIdleHide();
      const start = revealProgressRef.current;
      if (start <= 0) return;
      const startTime = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / IDLE_HIDE_MS);
        const eased = 1 - (1 - t) ** 2;
        setProgress(start * (1 - eased));
        if (t < 1) {
          idleHideFrameRef.current = requestAnimationFrame(step);
        } else {
          idleHideFrameRef.current = null;
          setProgress(0);
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
        const y = window.scrollY;
        const delta = y - lastScrollYRef.current;

        setFabVisible(y > FAB_SCROLL_THRESHOLD_PX);

        const shouldActivateOverlayMode =
          y > SCROLL_UP_THRESHOLD_PX || (overlayModeActiveRef.current && y > 0);

        if (!shouldActivateOverlayMode) {
          overlayModeActiveRef.current = false;
          clearHideTimer();
          setMobileHeaderOverlayMode(false);
          setProgress(0);
        } else {
          overlayModeActiveRef.current = true;
          setMobileHeaderOverlayMode(true);

          if (delta < 0) {
            setProgress(
              revealProgressRef.current + -delta / REVEAL_DISTANCE_PX,
            );
            scheduleHide();
          } else if (delta > 0) {
            setProgress(
              revealProgressRef.current - delta / REVEAL_DISTANCE_PX,
            );
            if (revealProgressRef.current <= 0) {
              clearHideTimer();
            } else {
              scheduleHide();
            }
          } else if (revealProgressRef.current > 0) {
            scheduleHide();
          }
        }

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
      overlayModeActiveRef.current = false;
      revealProgressRef.current = 0;
      setMobileHeaderRevealProgress(0);
      setMobileHeaderOverlayMode(false);
    };
  }, [
    mobile,
    headerScrollsAway,
    setMobileHeaderRevealProgress,
    setMobileHeaderOverlayMode,
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
