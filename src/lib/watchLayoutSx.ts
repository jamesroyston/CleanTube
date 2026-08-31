import { LANDSCAPE_RAIL_INSET, MOBILE_LANDSCAPE } from "@/lib/mobileLandscape";

/** Phones in portrait: edge-to-edge video; text/sidebar keep horizontal inset. */
export const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

/**
 * Landscape phones: the player is the whole page. Pinned to the viewport so the
 * element never moves in the tree (moving it would reload the YouTube iframe),
 * inset by the notch on whichever side it lands and by the right-edge nav rail.
 */
export const watchPlayerShellSx = {
  mb: { xs: 2, sm: 3 },
  width: "100%",
  aspectRatio: "16 / 9",
  [MOBILE_LANDSCAPE]: {
    position: "fixed",
    /**
     * Flush to the physical left edge. The iframe is overscanned left in JS so
     * YouTube's internal safe-area bar is clipped off-screen.
     */
    top: 0,
    height: "100lvh",
    bottom: "auto",
    left: 0,
    right: LANDSCAPE_RAIL_INSET,
    /** `width: 100%` would over-constrain the box and make `right` a no-op. */
    width: "auto",
    pl: 0,
    pr: 0,
    mb: 0,
    aspectRatio: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    bgcolor: "background.default",
    zIndex: 1,
  },
} as const;

export const watchPlayerPlaceholderSx = {
  width: "100%",
  height: "100%",
  borderRadius: { xs: 0, sm: 1 },
  bgcolor: "action.hover",
  [MOBILE_PORTRAIT]: { borderRadius: 0 },
  [MOBILE_LANDSCAPE]: { borderRadius: 0 },
} as const;

export const watchBelowPlayerPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
  [MOBILE_LANDSCAPE]: { display: "none" },
} as const;

export const watchSidebarPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
  [MOBILE_LANDSCAPE]: { display: "none" },
} as const;

export const watchPageGridSx = {
  alignItems: "flex-start",
  /** Horizontal safe-area so landscape iPhone (including >900px) clears the notch. */
  pl: {
    xs: "max(16px, env(safe-area-inset-left, 0px))",
    sm: "env(safe-area-inset-left, 0px)",
  },
  pr: {
    xs: "max(16px, env(safe-area-inset-right, 0px))",
    sm: "env(safe-area-inset-right, 0px)",
  },
  [MOBILE_PORTRAIT]: { pl: 0, pr: 0 },
  /** Player is pinned to the viewport in landscape; grid padding would only shift siblings. */
  [MOBILE_LANDSCAPE]: { pl: 0, pr: 0 },
} as const;
