"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  isAppShellExperience,
  shouldReplaceAppNavigation,
} from "@/lib/appShellNavigation";
import { stopActiveWatchPlayer } from "@/lib/watchPlayerLifecycle";

/**
 * PWA / native shell: force replace for root navigations that would otherwise
 * push (e.g. logo, account menu, error CTAs), so main pages never sit on a
 * watch entry in the history stack.
 */
export function AppShellNavigationPolicy() {
  const router = useRouter();
  const pathname = usePathname();

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
