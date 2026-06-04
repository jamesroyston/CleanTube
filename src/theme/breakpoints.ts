/** MUI breakpoint values — keep in sync with compact-layout bootstrap and globals.css. */
export const BREAKPOINT_VALUES = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1024,
  xl: 1280,
} as const;

/** `max-width` media query offset (0.05px) avoids overlap at exact breakpoint px. */
export const MD_DOWN_MAX = `${BREAKPOINT_VALUES.md - 0.05}px`;
export const LG_DOWN_MAX = `${BREAKPOINT_VALUES.lg - 0.05}px`;

export const COMPACT_VIEWPORT_MQ = `(max-width: ${MD_DOWN_MAX})`;
export const TOUCH_COMPACT_VIEWPORT_MQ = `(max-width: ${LG_DOWN_MAX})`;
