import { LANDSCAPE_VIDEO_WIDTH, MOBILE_LANDSCAPE } from "@/lib/mobileLandscape";

/** Phones in portrait: edge-to-edge video; text/sidebar keep horizontal inset. */
export const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

/**
 * Landscape phones: the player is a centered 16:9 box, not a full-screen
 * overlay (that overlay ate taps and sat the skeleton under the rail).
 */
export const watchPlayerShellSx = {
  mb: { xs: 2, sm: 3 },
  width: "100%",
  aspectRatio: "16 / 9",
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  zIndex: 0,
  [MOBILE_LANDSCAPE]: {
    position: "fixed",
    width: `var(--ct-landscape-video-width, ${LANDSCAPE_VIDEO_WIDTH})`,
    aspectRatio: "16 / 9",
    height: "auto",
    left: "calc((100vw - var(--ct-landscape-video-width, min(100vw, calc(100dvh * 16 / 9)))) / 2)",
    top: "calc((100dvh - var(--ct-landscape-video-width, min(100vw, calc(100dvh * 16 / 9))) * 9 / 16) / 2)",
    right: "auto",
    bottom: "auto",
    py: 0,
    px: 0,
    mb: 0,
    overflow: "hidden",
    bgcolor: "background.default",
    boxSizing: "border-box",
    border: "2px solid",
    borderColor: "primary.main",
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
