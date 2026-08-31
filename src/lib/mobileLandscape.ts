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

/**
 * Breathing room around the video. Without it the video sits flush against the
 * rail's border whenever the usable width is narrower than 16:9 of the height,
 * which reads as the video slipping underneath the rail. The rail side gets more,
 * since that is the edge where crowding is visible.
 */
export const LANDSCAPE_VIDEO_GUTTER_PX = 8;
