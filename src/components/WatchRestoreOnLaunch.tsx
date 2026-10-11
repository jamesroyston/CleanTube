"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

import { isStandalonePwa } from "@/lib/pwaPlatform";
import {
  claimColdLaunch,
  clearActiveWatch,
  isAtDocumentEntryUrl,
  readActiveWatch,
  WATCH_RESTORE_MAX_AGE_MS,
} from "@/lib/watchRestore";

/**
 * iOS kills backgrounded home-screen apps and relaunches them at `start_url`.
 * On the first route of a fresh session, reopen the watch page that was visible
 * when the app went away.
 */
export function WatchRestoreOnLaunch() {
  const router = useRouter();

  useLayoutEffect(() => {
    if (!claimColdLaunch()) return;

    const { pathname, search } = window.location;
    if (pathname.startsWith("/watch/")) return;

    const marker = readActiveWatch();
    if (!marker) return;

    const age = Date.now() - marker.savedAt;
    const atPlainHome =
      pathname === "/" && !new URLSearchParams(search).get("q")?.trim();
    if (
      atPlainHome &&
      isAtDocumentEntryUrl() &&
      isStandalonePwa() &&
      age >= 0 &&
      age < WATCH_RESTORE_MAX_AGE_MS
    ) {
      router.replace(marker.href);
      return;
    }

    clearActiveWatch();
  }, [router]);

  return null;
}
