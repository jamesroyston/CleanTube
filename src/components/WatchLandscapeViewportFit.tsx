"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  MOBILE_LANDSCAPE_QUERY,
  syncMobileSafeArea,
} from "@/lib/mobileLandscape";

/**
 * Portrait (and every non-watch page) uses `viewport-fit=cover` so chrome
 * gets real safe-area padding. Landscape watch uses `auto` so iOS does not
 * inset YouTube's video. Always re-apply CSS safe-area floors afterward —
 * toggling fit can leave env() at 0 in the iOS PWA.
 */
function writeViewportFit(fit: "cover" | "auto") {
  const current = document.querySelector('meta[name="viewport"]');
  if (!(current instanceof HTMLMetaElement)) return;
  if (!current.content.toLowerCase().includes(`viewport-fit=${fit}`)) {
    const parts = current.content
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && !part.toLowerCase().startsWith("viewport-fit"));
    parts.push(`viewport-fit=${fit}`);
    current.content = parts.join(", ");
  }
  syncMobileSafeArea();
  requestAnimationFrame(() => syncMobileSafeArea());
}

export function WatchLandscapeViewportFit() {
  const pathname = usePathname();

  useEffect(() => {
    const orientation = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
    const apply = () => {
      const landscapeWatch =
        pathname.startsWith("/watch/") && orientation.matches;
      writeViewportFit(landscapeWatch ? "auto" : "cover");
    };
    apply();
    orientation.addEventListener("change", apply);
    window.addEventListener("pageshow", apply);
    return () => {
      orientation.removeEventListener("change", apply);
      window.removeEventListener("pageshow", apply);
      writeViewportFit("cover");
    };
  }, [pathname]);

  return null;
}
