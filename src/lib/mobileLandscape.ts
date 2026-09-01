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

/** 56px icon column — video's right edge and default rail width. */
export const LANDSCAPE_RAIL_CONTENT = `${LANDSCAPE_RAIL_WIDTH_PX}px`;

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
