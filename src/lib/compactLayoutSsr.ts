import mediaQuery from "css-mediaquery";

import type { CompactLayoutHint } from "@/lib/compactLayoutHint";

/** iPhone-class width for SSR `useMediaQuery` evaluation. */
export const MOBILE_SSR_WIDTH_PX = 390;

/** Desktop browser width when compact/mobile hints are false. */
export const DESKTOP_SSR_WIDTH_PX = 1280;

export function compactLayoutSsrWidth(hint: CompactLayoutHint): number {
  if (hint.mobileExperience || hint.compactViewport) {
    return MOBILE_SSR_WIDTH_PX;
  }
  return DESKTOP_SSR_WIDTH_PX;
}

function isTouchOrPwaMediaQuery(query: string): boolean {
  return (
    query.includes("display-mode: standalone") ||
    query.includes("pointer: coarse") ||
    query.includes("hover: none")
  );
}

function matchCompactLayoutQuery(
  query: string,
  hint: CompactLayoutHint,
  widthPx: number,
): boolean {
  if (isTouchOrPwaMediaQuery(query)) {
    return hint.touchPrimary;
  }
  return mediaQuery.match(query, {
    width: `${widthPx}px`,
  });
}

/**
 * MUI theme-level `ssrMatchMedia` aligned with `initialCompactLayoutHint`.
 * @see https://mui.com/material-ui/react-use-media-query/#server-side-rendering
 */
export function createSsrMatchMedia(hint: CompactLayoutHint) {
  const widthPx = compactLayoutSsrWidth(hint);
  return (query: string) => ({
    matches: matchCompactLayoutQuery(query, hint, widthPx),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
