"use client";

import { useShowBottomNav } from "@/hooks/useCompactViewport";

/**
 * Touch/PWA mobile product surface (bottom app bar, route-based library/account).
 * Use this for product behavior — not `useCompactViewport()`, which also covers
 * narrow desktop browser windows that keep the scroll-reveal header + drawer.
 */
export function useMobileExperience(): boolean {
  return useShowBottomNav();
}
