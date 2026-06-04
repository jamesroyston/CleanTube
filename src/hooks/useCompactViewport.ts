"use client";

/**
 * Compact viewport layout policy:
 *
 * | Viewport | Input | Bottom nav | Top header |
 * |----------|-------|------------|------------|
 * | < 900px | touch or PWA | Yes (logo-only) | Sticky/static |
 * | < 900px | desktop mouse | No | Full bar + scroll-reveal where HEADER_SCROLLS_AWAY applies |
 * | ≥ 900px | any | No | Fixed + library rail |
 */

import useMediaQuery from "@mui/material/useMediaQuery";

import { BOTTOM_NAV_HEIGHT_PX } from "@/lib/compactLayout";

/** Below MUI `md` (900px): document scroll, compact header layout. */
export const COMPACT_VIEWPORT_QUERY = "(max-width:899.95px)";

/**
 * Header uses in-flow layout on xs portrait and mobile landscape (scroll-reveal applies).
 * Tablet portrait (600–899px) uses sticky header without scroll-reveal.
 */
export const HEADER_SCROLLS_AWAY_QUERY =
  "(max-width:599.95px), (max-width:899.95px) and (orientation: landscape)";

/** Touch-primary device or installed PWA — not narrow desktop browser windows. */
export const TOUCH_OR_PWA_QUERY =
  "(hover: none) and (pointer: coarse), (display-mode: standalone)";

export function useCompactViewport(): boolean {
  return useMediaQuery(COMPACT_VIEWPORT_QUERY);
}

export function useHeaderScrollsAway(): boolean {
  return useMediaQuery(HEADER_SCROLLS_AWAY_QUERY);
}

/**
 * Bottom app bar: compact viewport on a touch device or installed home-screen app.
 * Narrow desktop browser windows keep the full top header + scroll-reveal instead.
 */
export function useShowBottomNav(): boolean {
  const compact = useCompactViewport();
  const touchOrPwa = useMediaQuery(TOUCH_OR_PWA_QUERY);
  return compact && touchOrPwa;
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
