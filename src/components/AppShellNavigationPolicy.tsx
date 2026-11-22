"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  isAppShellExperience,
  shouldReplaceAppNavigation,
} from "@/lib/appShellNavigation";
import { stopActiveWatchPlayer } from "@/lib/watchPlayerLifecycle";

function fullPath(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Drop session-history entries ahead of the current one after leaving watch via
 * swipe-back / hardware back, so swipe-forward cannot reopen the video.
 */
function truncateForwardHistory(): void {
  const url =
    window.location.pathname + window.location.search + window.location.hash;
  window.history.pushState(window.history.state, "", url);
}

/**
 * PWA / native shell: force replace for root navigations that would otherwise
 * push (e.g. logo, account menu, error CTAs), so main pages never sit on a
 * watch entry in the history stack. Also truncates forward history after
 * swipe-back from `/watch/*`.
 */
export function AppShellNavigationPolicy() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const pathRef = useRef(fullPath(pathname, search));

  useEffect(() => {
    pathRef.current = fullPath(pathname, search);
  }, [pathname, search]);

  useEffect(() => {
    if (!isAppShellExperience()) return;

    const onPopState = () => {
      const previous = pathRef.current;
      const next = fullPath(
        window.location.pathname,
        window.location.search.replace(/^\?/, ""),
      );
      const leftWatch = previous.startsWith("/watch/");
      const landedOutsideWatch = !window.location.pathname.startsWith("/watch/");
      pathRef.current = next;

      if (leftWatch && landedOutsideWatch) {
        truncateForwardHistory();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isAppShellExperience()) return;

    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") {
        return;
      }

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}${url.search}`;
      if (!shouldReplaceAppNavigation(pathname, next)) return;

      event.preventDefault();
      event.stopPropagation();
      if (pathname.startsWith("/watch/")) {
        stopActiveWatchPlayer();
      }
      router.replace(next);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [pathname, router]);

  return null;
}
