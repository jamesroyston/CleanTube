"use client";

/**
 * Compact viewport layout policy:
 *
 * | Viewport | Input | Bottom nav | Top header |
 * |----------|-------|------------|------------|
 * | < 900px (or touch ≤1024px) | touch or PWA | Yes (logo-only) | Sticky/static |
 * | < 900px | desktop mouse | No | Full bar + scroll-reveal where HEADER_SCROLLS_AWAY applies |
 * | ≥ 900px | any | No | Fixed + library rail |
 *
 * Touch phones in landscape often exceed 900px (e.g. iPhone 15 Pro Max ≈932px), so touch
 * devices keep compact layout up to 1024px.
 *
 * SSR/first paint uses `CompactLayoutProvider` hints (cookie + UA) as `useMediaQuery`
 * `defaultMatches` to avoid a desktop-layout flash before hydration.
 */

import { useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";

import { useCompactLayoutHint } from "@/context/CompactLayoutContext";
import { BOTTOM_NAV_HEIGHT_PX } from "@/lib/compactLayout";
import {
  mergeCompactLayoutHints,
  readCompactLayoutBootstrapFromDom,
} from "@/lib/compactLayoutBootstrap";
import type { CompactLayoutHint } from "@/lib/compactLayoutHint";
import {
  COMPACT_VIEWPORT_MQ,
  TOUCH_COMPACT_VIEWPORT_MQ,
} from "@/theme/breakpoints";

function useEffectiveCompactLayoutHint(): CompactLayoutHint {
  const serverHint = useCompactLayoutHint();
  return mergeCompactLayoutHints(
    serverHint,
    readCompactLayoutBootstrapFromDom(),
  );
}

/** Below MUI `md` (900px): document scroll, compact header layout. */
export const COMPACT_VIEWPORT_QUERY = COMPACT_VIEWPORT_MQ;

/** Touch/PWA compact layout through phone landscape widths (below `lg`). */
export const TOUCH_COMPACT_VIEWPORT_QUERY = TOUCH_COMPACT_VIEWPORT_MQ;

/**
 * Header uses in-flow layout on xs portrait and mobile landscape (scroll-reveal applies).
 * Tablet portrait (600–899px) uses sticky header without scroll-reveal.
 */
export const HEADER_SCROLLS_AWAY_QUERY =
  "(max-width:599.95px), (max-width:899.95px) and (orientation: landscape)";

/**
 * Touch-primary device or installed PWA — not narrow desktop browser windows.
 * `(pointer: coarse)` alone covers Android browsers that omit `hover: none`.
 */
export const TOUCH_OR_PWA_QUERY =
  "(hover: none) and (pointer: coarse), (pointer: coarse), (display-mode: standalone)";

/** Safari “Request Desktop Website” can report fine pointer; iOS still has touch input. */
function readTouchInputFallback(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 0;
}

export function useTouchPrimaryDevice(): boolean {
  const hint = useEffectiveCompactLayoutHint();
  const mediaMatch = useMediaQuery(TOUCH_OR_PWA_QUERY, {
    defaultMatches: hint.touchPrimary,
  });
  const [touchInputFallback] = useState(readTouchInputFallback);
  return mediaMatch || touchInputFallback;
}

export function useCompactViewport(): boolean {
  const hint = useEffectiveCompactLayoutHint();
  const defaultCompact = useMediaQuery(COMPACT_VIEWPORT_QUERY, {
    defaultMatches: hint.compactViewport,
  });
  const touchWideCompact = useMediaQuery(TOUCH_COMPACT_VIEWPORT_QUERY, {
    defaultMatches: hint.compactViewport,
  });
  const touchPrimary = useTouchPrimaryDevice();
  return defaultCompact || (touchPrimary && touchWideCompact);
}

export function useHeaderScrollsAway(): boolean {
  const hint = useEffectiveCompactLayoutHint();
  return useMediaQuery(HEADER_SCROLLS_AWAY_QUERY, {
    defaultMatches: hint.compactViewport,
  });
}

/**
 * Bottom app bar: compact viewport on a touch device or installed home-screen app.
 * Narrow desktop browser windows keep the full top header + scroll-reveal instead.
 */
export function useShowBottomNav(): boolean {
  const compact = useCompactViewport();
  const touchPrimary = useTouchPrimaryDevice();
  return compact && touchPrimary;
}

export function useScrollRevealHeader(): boolean {
  const compact = useCompactViewport();
  const headerScrollsAway = useHeaderScrollsAway();
  const showBottomNav = useShowBottomNav();
  return compact && headerScrollsAway && !showBottomNav;
}

/** Main content padding when the fixed bottom app bar is shown. */
export function compactMainPaddingBottom(
  showBottomNav: boolean,
  basePaddingPx = 0,
): string | number | undefined {
  if (!showBottomNav) {
    return basePaddingPx || undefined;
  }
  const base = basePaddingPx > 0 ? `${basePaddingPx}px + ` : "";
  return `calc(${base}${BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;
}
