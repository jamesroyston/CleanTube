/**
 * Pre-hydration layout detection for touch/PWA (incl. first installed launch).
 *
 * A blocking inline script in root layout runs before body paint, sets `data-*`
 * flags on `<html>`, and CSS hides desktop shell chrome immediately when mobile
 * experience applies — even if SSR/cookie hints were wrong.
 *
 * Keep media query strings aligned with `useCompactViewport.ts`.
 */

import type { CompactLayoutHint } from "@/lib/compactLayoutHint";
import {
  COMPACT_VIEWPORT_MQ,
  TOUCH_COMPACT_VIEWPORT_MQ,
} from "@/theme/breakpoints";

export const COMPACT_LAYOUT_DATA_ATTRS = {
  pwaStandalone: "data-pwa-standalone",
  touchPrimary: "data-touch-primary",
  compactViewport: "data-compact-viewport",
  mobileExperience: "data-mobile-experience",
} as const;

/** Minified IIFE — no external deps; runs synchronously in `<head>`. */
export const COMPACT_LAYOUT_BOOTSTRAP_SCRIPT = `(function(){var d=document.documentElement,m=window.matchMedia;if(!d||!m)return;var standalone=m("(display-mode: standalone)").matches||m("(display-mode: fullscreen)").matches||m("(display-mode: minimal-ui)").matches||(typeof navigator!=="undefined"&&navigator.standalone===true);var touchMq=m("(hover: none) and (pointer: coarse), (pointer: coarse), (display-mode: standalone)").matches;var touchFallback=typeof navigator!=="undefined"&&navigator.maxTouchPoints>0;var touchPrimary=touchMq||touchFallback||standalone;var compactMq=m("${COMPACT_VIEWPORT_MQ}").matches;var touchWideMq=m("${TOUCH_COMPACT_VIEWPORT_MQ}").matches;var compact=compactMq||(touchPrimary&&touchWideMq);var mobile=compact&&touchPrimary;function set(a,v){if(v)d.setAttribute(a,"1");else d.removeAttribute(a);}set("data-pwa-standalone",standalone);set("data-touch-primary",touchPrimary);set("data-compact-viewport",compact);set("data-mobile-experience",mobile);})();`;

export function readCompactLayoutBootstrapFromDom(): CompactLayoutHint | null {
  if (typeof document === "undefined") return null;
  const el = document.documentElement;
  const hasAny =
    el.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.pwaStandalone) ||
    el.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.touchPrimary) ||
    el.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.compactViewport) ||
    el.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.mobileExperience);
  if (!hasAny) return null;
  return {
    compactViewport: el.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.compactViewport),
    touchPrimary: el.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.touchPrimary),
    mobileExperience: el.hasAttribute(
      COMPACT_LAYOUT_DATA_ATTRS.mobileExperience,
    ),
  };
}

/** Prefer mobile when either source says so — avoids desktop flash before hydration. */
export function mergeCompactLayoutHints(
  base: CompactLayoutHint,
  override: CompactLayoutHint | null | undefined,
): CompactLayoutHint {
  if (!override) return base;
  return {
    compactViewport: base.compactViewport || override.compactViewport,
    touchPrimary: base.touchPrimary || override.touchPrimary,
    mobileExperience: base.mobileExperience || override.mobileExperience,
  };
}

export function compactLayoutHintToHtmlDataAttributes(
  hint: CompactLayoutHint,
): Record<string, string | undefined> {
  return {
    [COMPACT_LAYOUT_DATA_ATTRS.compactViewport]: hint.compactViewport
      ? "1"
      : undefined,
    [COMPACT_LAYOUT_DATA_ATTRS.touchPrimary]: hint.touchPrimary
      ? "1"
      : undefined,
    [COMPACT_LAYOUT_DATA_ATTRS.mobileExperience]: hint.mobileExperience
      ? "1"
      : undefined,
  };
}
