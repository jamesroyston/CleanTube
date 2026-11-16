"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  MOBILE_LANDSCAPE_QUERY,
  syncMobileSafeArea,
} from "@/lib/mobileLandscape";

/**
 * With `viewport-fit=cover`, WebKit insets the `<video>` inside YouTube's
 * iframe while the player chrome keeps filling it, so the picture sits in from
 * the left edge and a black bar shows beside it. Landscape watch runs on
 * `auto` for that reason; the island geometry comes from `--ct-island-*`,
 * which is measured in JS and does not depend on `env()`. Everything else
 * keeps `cover` so chrome gets real safe-area padding.
 */
function writeViewportFit(fit: "cover" | "auto") {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!(meta instanceof HTMLMetaElement)) return;
  if (!meta.content.toLowerCase().includes(`viewport-fit=${fit}`)) {
    const parts = meta.content
      .split(",")
      .map((part) => part.trim())
      .filter(
        (part) => part.length > 0 && !part.toLowerCase().startsWith("viewport-fit"),
      );
    parts.push(`viewport-fit=${fit}`);
    meta.content = parts.join(", ");
  }
}

export function WatchLandscapeViewportFit() {
  const pathname = usePathname();

  /** Routes outside this layout (auth, offline) expect `cover`. */
  useEffect(() => {
    return () => {
      writeViewportFit("cover");
      syncMobileSafeArea();
    };
  }, []);

  useEffect(() => {
    const orientation = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
    const timers: number[] = [];
    const apply = () => {
      const landscapeWatch =
        pathname.startsWith("/watch/") && orientation.matches;
      writeViewportFit(landscapeWatch ? "auto" : "cover");
      /** iOS recomputes `env()` a frame or two after the meta changes. */
      syncMobileSafeArea();
      for (const timer of timers) window.clearTimeout(timer);
      timers.length = 0;
      for (const delay of [50, 200, 500]) {
        timers.push(window.setTimeout(syncMobileSafeArea, delay));
      }
    };
    apply();
    orientation.addEventListener("change", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("pageshow", apply);
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      orientation.removeEventListener("change", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("pageshow", apply);
    };
  }, [pathname]);

  return null;
}
