import { isNativeAppShell, isStandalonePwa } from "@/lib/pwaPlatform";

/**
 * Installed PWA or native WKWebView shell — treat history like an app, not a
 * browser tab (no main/root pages stacked on watch; prefer replace).
 */
export function isAppShellExperience(): boolean {
  if (typeof window === "undefined") {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-app-shell") === "1";
  }
  if (document.documentElement.getAttribute("data-app-shell") === "1") {
    return true;
  }
  return isStandalonePwa() || isNativeAppShell();
}

/**
 * Tab / section roots that should not sit on top of a watch page in the
 * history stack (swipe-back would unexpectedly return to the video).
 */
export function isAppRootPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/library" || pathname.startsWith("/library/")) return true;
  if (pathname === "/history" || pathname === "/watch-later") return true;
  if (pathname === "/account" || pathname === "/settings") return true;
  if (pathname.startsWith("/auth")) return true;
  return false;
}

function pathnameFromHref(href: string): string | null {
  try {
    return new URL(href, "https://cleantube.invalid").pathname;
  } catch {
    return null;
  }
}

/**
 * Whether an in-app navigation should replace the current history entry when
 * running as PWA / native shell.
 */
export function shouldReplaceAppNavigation(
  fromPathname: string,
  toHref: string,
): boolean {
  if (!isAppShellExperience()) return false;
  const toPathname = pathnameFromHref(toHref);
  if (!toPathname) return false;

  const fromWatch = fromPathname.startsWith("/watch/");
  const toRoot = isAppRootPath(toPathname);
  const fromRoot = isAppRootPath(fromPathname);

  // Main pages must not stack on a watch page.
  if (fromWatch && toRoot) return true;
  // Tab / section switches should not deepen the stack (or create forward entries).
  // Same-path query changes (e.g. `/` ↔ `/?q=`) still push so back can clear search.
  if (fromRoot && toRoot && fromPathname !== toPathname) return true;
  return false;
}

type AppRouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/** push vs replace for PWA/native shell; always push in ordinary browser tabs. */
export function navigateAppPath(
  router: AppRouterLike,
  href: string,
  fromPathname: string,
): void {
  if (shouldReplaceAppNavigation(fromPathname, href)) {
    router.replace(href);
    return;
  }
  router.push(href);
}

/** Leaving watch via the app-bar back control: replace so watch is not under the destination. */
export function shouldReplaceWatchBackNavigation(): boolean {
  return isAppShellExperience();
}
