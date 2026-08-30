/** Phones in portrait: edge-to-edge video; text/sidebar keep horizontal inset. */
export const MOBILE_PORTRAIT =
  "@media (max-width: 599.95px) and (orientation: portrait)";

export const watchPlayerShellSx = {
  mb: { xs: 2, sm: 3 },
  width: "100%",
  aspectRatio: "16 / 9",
} as const;

export const watchPlayerPlaceholderSx = {
  width: "100%",
  height: "100%",
  borderRadius: { xs: 0, sm: 1 },
  bgcolor: "action.hover",
  [MOBILE_PORTRAIT]: { borderRadius: 0 },
} as const;

export const watchBelowPlayerPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
} as const;

export const watchSidebarPadSx = {
  [MOBILE_PORTRAIT]: { px: 2 },
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
} as const;
