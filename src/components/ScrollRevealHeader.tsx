"use client";

import { useEffect, useRef } from "react";

import { useHeaderScroll } from "@/context/HeaderScrollContext";
import { useScrollRevealHeader } from "@/hooks/useCompactViewport";

/** Below this scroll offset, the in-flow header is the primary chrome. */
const SCROLL_UP_THRESHOLD_PX = 80;
/** Deactivate overlay mode when scrolling back near the top. */
const SCROLL_DOWN_DEACTIVATE_PX = 40;
/** Scroll-up distance (px) for a fully revealed header overlay. */
const REVEAL_DISTANCE_PX = 88;
/** Hide the revealed header after idle scroll time when not at top. */
const AUTO_HIDE_MS = 3_000;
const IDLE_HIDE_MS = 300;
/** Lerp factor per frame for display progress toward target. */
const DISPLAY_LERP = 0.16;
/** Min progress delta before syncing React state (reduces Header re-renders). */
const PROGRESS_STATE_EPSILON = 0.01;

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeInOut(t: number): number {
  return (1 - Math.cos(t * Math.PI)) / 2;
}

/**
 * Scroll-driven hide/reveal for the top header on compact viewports without the
 * bottom app bar (e.g. narrow desktop browser windows).
 */
export function ScrollRevealHeader() {
  const scrollRevealEnabled = useScrollRevealHeader();
  const { setHeaderRevealProgress, setHeaderOverlayActive } = useHeaderScroll();
  const lastScrollYRef = useRef(0);
  const targetProgressRef = useRef(0);
  const displayProgressRef = useRef(0);
  const publishedProgressRef = useRef(0);
  const overlayModeActiveRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const idleHideFrameRef = useRef<number | null>(null);
  const smoothFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scrollRevealEnabled) {
      targetProgressRef.current = 0;
      displayProgressRef.current = 0;
      publishedProgressRef.current = 0;
      setHeaderRevealProgress(0);
      setHeaderOverlayActive(false);
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

    function publishDisplayProgress(next: number) {
      const clamped = clampProgress(next);
      displayProgressRef.current = clamped;
      if (
        Math.abs(clamped - publishedProgressRef.current) <
        PROGRESS_STATE_EPSILON
      ) {
        return;
      }
      publishedProgressRef.current = clamped;
      setHeaderRevealProgress(clamped);
    }

    function flushPublishedProgress() {
      const clamped = displayProgressRef.current;
      if (publishedProgressRef.current === clamped) return;
      publishedProgressRef.current = clamped;
      setHeaderRevealProgress(clamped);
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
          flushPublishedProgress();
          smoothFrameRef.current = null;
          return;
        }

        smoothFrameRef.current = requestAnimationFrame(step);
      };

      smoothFrameRef.current = requestAnimationFrame(step);
    }

    function idleHideHeader() {
      cancelIdleHide();
      cancelSmoothLoop();
      const start = displayProgressRef.current;
      if (start <= 0) return;
      const startTime = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / IDLE_HIDE_MS);
        const next = start * (1 - easeInOut(t));
        targetProgressRef.current = next;
        publishDisplayProgress(next);
        if (t < 1) {
          idleHideFrameRef.current = requestAnimationFrame(step);
        } else {
          idleHideFrameRef.current = null;
          targetProgressRef.current = 0;
          displayProgressRef.current = 0;
          publishedProgressRef.current = 0;
          setHeaderRevealProgress(0);
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

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        cancelIdleHide();
        const y = window.scrollY;
        const delta = y - lastScrollYRef.current;

        const shouldActivateOverlayMode =
          y > SCROLL_UP_THRESHOLD_PX ||
          (overlayModeActiveRef.current && y > SCROLL_DOWN_DEACTIVATE_PX);

        if (!shouldActivateOverlayMode) {
          overlayModeActiveRef.current = false;
          clearHideTimer();
          setHeaderOverlayActive(false);
          setTargetProgress(0);
        } else {
          overlayModeActiveRef.current = true;
          setHeaderOverlayActive(true);

          if (delta < 0) {
            const nextTarget = clampProgress(
              targetProgressRef.current + -delta / REVEAL_DISTANCE_PX,
            );
            setTargetProgress(nextTarget);
            publishDisplayProgress(nextTarget);
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
      overlayModeActiveRef.current = false;
      targetProgressRef.current = 0;
      displayProgressRef.current = 0;
      publishedProgressRef.current = 0;
      setHeaderRevealProgress(0);
      setHeaderOverlayActive(false);
    };
  }, [scrollRevealEnabled, setHeaderRevealProgress, setHeaderOverlayActive]);

  return null;
}
