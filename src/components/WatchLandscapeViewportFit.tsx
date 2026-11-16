"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { syncMobileSafeArea } from "@/lib/mobileLandscape";

/**
 * Keep `viewport-fit=cover` stable. Toggling it to `auto` on landscape watch
 * made iOS report 0 (or both edges) for safe-area, which padded the video and
 * clipped the nav rail. Portrait re-entry also left the sticky header low
 * until the next swipe; settling the visual viewport puts it back.
 */
function ensureViewportFitCover() {
  const current = document.querySelector('meta[name="viewport"]');
  if (!(current instanceof HTMLMetaElement)) return;
  if (current.content.toLowerCase().includes("viewport-fit=cover")) return;
  const parts = current.content
    .split(",")
    .map((part) => part.trim())
    .filter(
      (part) => part.length > 0 && !part.toLowerCase().startsWith("viewport-fit"),
    );
  parts.push("viewport-fit=cover");
  current.content = parts.join(", ");
  syncMobileSafeArea();
}

export function WatchLandscapeViewportFit() {
  const pathname = usePathname();

  useEffect(() => {
    ensureViewportFitCover();
    window.addEventListener("orientationchange", ensureViewportFitCover);
    window.addEventListener("pageshow", ensureViewportFitCover);
    return () => {
      window.removeEventListener("orientationchange", ensureViewportFitCover);
      window.removeEventListener("pageshow", ensureViewportFitCover);
    };
  }, [pathname]);

  return null;
}
