"use client";

import { useSyncExternalStore } from "react";

import {
  compactMainPaddingBottom,
  useShowBottomNav,
} from "@/hooks/useCompactViewport";
import { COMPACT_LAYOUT_DATA_ATTRS } from "@/lib/compactLayoutBootstrap";
import { isNativeAppShell, isStandalonePwa } from "@/lib/pwaPlatform";

/**
 * Installed app shell (home-screen PWA or the native WKWebView shell).
 *
 * In a browser tab the document has to scroll so the URL bar can collapse. An
 * installed shell has no collapsing chrome, so the app owns a viewport-sized
 * frame with its own scroller and in-flow bottom bar instead. That keeps every
 * piece of chrome out of `position: fixed`, which iOS WebKit drifts out of
 * place while the *document* scrolls (webkit.org/b/301172) — the bug that let
 * the bottom app bar ride up over the feed.
 */
const APP_SHELL_MEDIA_QUERY =
  "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)";

function subscribeToAppShell(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(APP_SHELL_MEDIA_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function readAppShell(): boolean {
  if (typeof document === "undefined") return false;
  /** Set by the head bootstrap script before hydration. */
  if (
    document.documentElement.hasAttribute(COMPACT_LAYOUT_DATA_ATTRS.appShell)
  ) {
    return true;
  }
  return isStandalonePwa() || isNativeAppShell();
}

function readAppShellOnServer(): boolean {
  return false;
}

export function useInstalledAppShell(): boolean {
  return useSyncExternalStore(
    subscribeToAppShell,
    readAppShell,
    readAppShellOnServer,
  );
}

/**
 * The shell is a viewport-sized frame with its own scroller: mobile product
 * surface running inside an installed app shell.
 */
export function useAppShellViewport(): boolean {
  const mobileExperience = useShowBottomNav();
  const installed = useInstalledAppShell();
  return mobileExperience && installed;
}

/** False when the bottom app bar is an in-flow row rather than a fixed overlay. */
export function useBottomNavOverlaysContent(): boolean {
  return !useAppShellViewport();
}

/** Page-level bottom gutter that clears the bottom app bar when it floats. */
export function useCompactMainPaddingBottom(
  basePaddingPx = 0,
): string | number | undefined {
  const showBottomNav = useShowBottomNav();
  const navOverlaysContent = useBottomNavOverlaysContent();
  return compactMainPaddingBottom(
    showBottomNav,
    basePaddingPx,
    navOverlaysContent,
  );
}
