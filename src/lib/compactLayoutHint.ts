/**
 * SSR / first-paint hints for compact layout hooks (`useCompactViewport`, etc.).
 * Client refines via media queries and persists touch-primary detection in a cookie.
 */

export const COMPACT_LAYOUT_HINT_COOKIE = "cleantube-compact-layout-hint";

export type CompactLayoutHint = {
  /** `useCompactViewport()` */
  compactViewport: boolean;
  /** Touch-primary or installed PWA (`useTouchPrimaryDevice`) */
  touchPrimary: boolean;
  /** `useShowBottomNav()` / `useMobileExperience()` */
  mobileExperience: boolean;
};

export function compactLayoutHintToCookieValue(hint: CompactLayoutHint): string {
  const flags = [
    hint.compactViewport ? "c" : "",
    hint.touchPrimary ? "t" : "",
    hint.mobileExperience ? "m" : "",
  ].join("");
  return flags || "0";
}

export function parseCompactLayoutHintCookie(
  value: string | undefined | null,
): CompactLayoutHint | null {
  if (value == null || value === "" || value === "0") return null;
  const v = value.trim().toLowerCase();
  return {
    compactViewport: v.includes("c"),
    touchPrimary: v.includes("t"),
    mobileExperience: v.includes("m"),
  };
}

/** Conservative UA match for phones/tablets (not narrow desktop windows). */
export function isLikelyTouchUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipod|ipad|mobile|webos|blackberry|iemobile|opera mini/i.test(
    userAgent,
  );
}

export function compactLayoutHintFromUserAgent(
  userAgent: string | null | undefined,
): CompactLayoutHint {
  const touchPrimary = isLikelyTouchUserAgent(userAgent);
  return {
    compactViewport: touchPrimary,
    touchPrimary,
    mobileExperience: touchPrimary,
  };
}

export const DEFAULT_COMPACT_LAYOUT_HINT: CompactLayoutHint = {
  compactViewport: false,
  touchPrimary: false,
  mobileExperience: false,
};

export function resolveCompactLayoutHint(
  cookieValue: string | undefined | null,
  userAgent: string | null | undefined,
): CompactLayoutHint {
  return (
    parseCompactLayoutHintCookie(cookieValue) ??
    compactLayoutHintFromUserAgent(userAgent)
  );
}
