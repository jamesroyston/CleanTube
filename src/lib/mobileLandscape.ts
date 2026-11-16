/**
 * Phone landscape: app bar and bottom nav give way to a right-edge icon rail and
 * a video pinned to the screen height.
 *
 * Driven by media queries rather than a React hook so rotation relayouts in one
 * frame and the watch iframe is never remounted (a remount restarts playback).
 *
 * `max-height` keeps tablets out; the touch/standalone clauses mirror the policy
 * in `useCompactViewport.ts` and `globals.css`.
 */

/** Icon column of the rail. The island, when it is on the right, is extra. */
export const LANDSCAPE_RAIL_WIDTH_PX = 56;

const SHAPE = "(orientation: landscape) and (max-height: 599.95px)";

/** Raw query for `matchMedia`. `globals.css` mirrors it too — keep all three in sync. */
export const MOBILE_LANDSCAPE_QUERY = [
  `${SHAPE} and (pointer: coarse)`,
  `${SHAPE} and (hover: none)`,
  `${SHAPE} and (display-mode: standalone)`,
].join(", ");

/** `sx` key for phone landscape. */
export const MOBILE_LANDSCAPE = `@media ${MOBILE_LANDSCAPE_QUERY}`;

export const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
export const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";
export const SAFE_TOP = "env(safe-area-inset-top, 0px)";
export const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

export const CT_SAFE_TOP = "var(--ct-safe-top, env(safe-area-inset-top, 0px))";
export const CT_SAFE_RIGHT = "var(--ct-safe-right, env(safe-area-inset-right, 0px))";
export const CT_SAFE_BOTTOM = "var(--ct-safe-bottom, env(safe-area-inset-bottom, 0px))";
export const CT_SAFE_LEFT = "var(--ct-safe-left, env(safe-area-inset-left, 0px))";

/** 56px icon column — video's right edge and default rail width. */
export const LANDSCAPE_RAIL_CONTENT = `${LANDSCAPE_RAIL_WIDTH_PX}px`;

/**
 * Fallback island inset when `viewport-fit=auto` zeros `env(safe-area-inset-*)`.
 * Face ID / Dynamic Island landscape is ~59px.
 */
export const LANDSCAPE_ISLAND_INSET_FALLBACK = "59px";
export const LANDSCAPE_ISLAND_PAD = `max(${LANDSCAPE_ISLAND_INSET_FALLBACK}, ${SAFE_RIGHT})`;

/** Largest 16:9 that fits the landscape viewport. Keep in sync with globals.css. */
export const LANDSCAPE_VIDEO_WIDTH = "min(100vw, calc(100dvh * 16 / 9))";

/**
 * Rail when the island is on the right: icon column plus the island band.
 * Do not use this as the default — iOS reports saR on both landscape sides.
 */
export const LANDSCAPE_RAIL_INSET = `calc(${LANDSCAPE_RAIL_WIDTH_PX}px + ${SAFE_RIGHT})`;

export const ISLAND_SIDE_ATTR = "data-island-side";

/** Pixel value of `env(safe-area-inset-*)` (0 when the inset is unset). */
export function readSafeAreaInset(side: "left" | "right" | "top" | "bottom"): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;padding-${side}:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const value =
    parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0;
  probe.remove();
  return value;
}

/**
 * Which long edge has the Dynamic Island. iOS often reports saL and saR as the
 * same value in both landscape directions, so insets alone cannot tell.
 * `90` = island on the left; `-90` / `270` = island on the right.
 */
export function landscapeIslandSide(): "left" | "right" {
  if (typeof window === "undefined") return "left";
  const left = readSafeAreaInset("left");
  const right = readSafeAreaInset("right");
  if (left > right + 10) return "left";
  if (right > left + 10) return "right";
  const angle =
    window.screen?.orientation?.angle ??
    (window as Window & { orientation?: number }).orientation ??
    0;
  return angle === -90 || angle === 270 ? "right" : "left";
}

export function syncLandscapeIslandSide(): void {
  if (typeof document === "undefined") return;
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  if (!landscape) {
    document.documentElement.removeAttribute(ISLAND_SIDE_ATTR);
    return;
  }
  document.documentElement.setAttribute(
    ISLAND_SIDE_ATTR,
    landscapeIslandSide(),
  );
}

/**
 * Portrait Dynamic Island / status-bar inset. Values above this after a
 * rotation are a stale landscape inset, which drops the header until a swipe
 * forces iOS to recompute `env(safe-area-inset-top)`.
 */
const PORTRAIT_TOP_MAX = 62;
const PORTRAIT_TOP_FALLBACK = 59;
const LANDSCAPE_ISLAND_FALLBACK = 59;

/**
 * iOS reports the island inset on both landscape edges, and after rotation it
 * can report a portrait top inset that is much too large. Keep one island
 * side, and ignore portrait tops that would push the nav bar down.
 */
export function applySafeAreaCssVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const standalone = root.getAttribute("data-pwa-standalone") === "1";
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  const top = readSafeAreaInset("top");
  const right = readSafeAreaInset("right");
  const bottom = readSafeAreaInset("bottom");
  const left = readSafeAreaInset("left");
  const extra = standalone ? 8 : 0;
  let sat = top;
  let sab = bottom;
  let sal = left;
  let sar = right;
  let islandLeft = 0;
  let islandRight = 0;

  if (landscape) {
    const side = landscapeIslandSide();
    const island = Math.max(LANDSCAPE_ISLAND_FALLBACK, left, right);
    islandLeft = side === "left" ? island : 0;
    islandRight = side === "right" ? island : 0;
    sat = top >= 1 && top <= 24 ? top : 0;
    sab = bottom >= 1 && bottom <= 34 ? bottom : standalone ? 21 : 0;
    sal = islandLeft;
    sar = islandRight;
  } else if (standalone) {
    const saneTop = top >= 20 && top <= PORTRAIT_TOP_MAX;
    sat = (saneTop ? top : PORTRAIT_TOP_FALLBACK) + extra;
    sab = (bottom >= 12 && bottom <= 40 ? bottom : 34) + extra;
    sal = left >= 1 && left <= 20 ? left : 0;
    sar = right >= 1 && right <= 20 ? right : 0;
  }

  root.style.setProperty("--ct-safe-top", `${sat}px`);
  root.style.setProperty("--ct-safe-right", `${sar}px`);
  root.style.setProperty("--ct-safe-bottom", `${sab}px`);
  root.style.setProperty("--ct-safe-left", `${sal}px`);
  root.style.setProperty("--ct-island-left", `${islandLeft}px`);
  root.style.setProperty("--ct-island-right", `${islandRight}px`);
}

/**
 * After rotating back to portrait, iOS can leave the visual viewport shifted
 * down. The sticky header then sits below its usual spot until the next swipe.
 * Call this from orientation changes only — a resize (keyboard, URL bar) must
 * not yank the page back to the top.
 */
export function settlePortraitViewport(): void {
  if (typeof window === "undefined") return;
  syncMobileSafeArea();
  if (window.matchMedia("(orientation: landscape)").matches) return;

  const offset = window.visualViewport?.offsetTop ?? 0;
  if (offset > 1) {
    window.scrollBy(0, -offset);
  }
  if (window.scrollY > 0 && window.scrollY < 160) {
    window.scrollTo(0, 0);
  } else if (window.scrollY < 2) {
    window.scrollTo(0, 1);
    window.scrollTo(0, 0);
  }
}

export function syncMobileSafeArea(): void {
  syncLandscapeIslandSide();
  applySafeAreaCssVars();
}
