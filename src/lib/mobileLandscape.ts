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

/** Icon column of the rail, before the notch inset is added. */
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

/**
 * Rail keeps its icon column and swallows whatever the notch claims on the right
 * edge, so a right-side notch costs the video the same width a left-side one does.
 */
export const LANDSCAPE_RAIL_INSET = `calc(${LANDSCAPE_RAIL_WIDTH_PX}px + ${SAFE_RIGHT})`;

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

function readCssPx(expr: string): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:${expr}`;
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value || 0;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Landscape player box: iOS PWA sometimes reports `innerHeight` as the screen
 * minus one safe-area band (59px), which leaves a gap above a `top:0;bottom:0`
 * shell. Prefer the large viewport / physical short side in standalone.
 */
export function readLandscapeViewportBox(): { top: number; height: number } {
  if (typeof window === "undefined") return { top: 0, height: 0 };
  const inner = window.innerHeight;
  const vv = window.visualViewport;
  const vvH = vv?.height ?? 0;
  const vvTop = vv?.offsetTop ?? 0;
  const lvh = readCssPx("100lvh");
  const dvh = readCssPx("100dvh");
  const screenShort = Math.min(window.screen.width, window.screen.height);

  let height = Math.max(
    inner,
    vvH,
    dvh,
    document.documentElement.clientHeight,
  );
  let top = 0;

  if (isStandaloneDisplay()) {
    height = Math.max(height, lvh);
    if (screenShort > height + 1 && screenShort - height <= 80) {
      top = height - screenShort;
      height = screenShort;
    }
  }

  if (vvTop > 0 && vvTop < 100) {
    top -= vvTop;
    height += vvTop;
  }

  return { top, height };
}
