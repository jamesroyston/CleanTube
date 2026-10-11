import { MOBILE_LANDSCAPE } from "@/lib/mobileLandscape";

/** Phones in portrait: edge-to-edge video; text/sidebar keep horizontal inset. */
export const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

/**
 * Landscape phones: the player is the whole page. Pinned to the viewport so the
 * element never moves in the tree (moving it would reload the YouTube iframe).
 */
export const watchPlayerShellSx = {
  mb: { xs: 2, sm: 3 },
  width: "100%",
  aspectRatio: "16 / 9",
  [MOBILE_LANDSCAPE]: {
    position: "fixed",
    /**
     * Full window. JS sizes a 16:9 clip in the center and places the iframe at
     * the window origin so iOS YouTube's window-sized picture lines up. The
     * rail stacks above this layer. Island-on-right overrides live in globals.css.
     */
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    /** `width: 100%` would over-constrain the box and make `right` a no-op. */
    width: "auto",
    py: 0,
    px: 0,
    mb: 0,
    aspectRatio: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
