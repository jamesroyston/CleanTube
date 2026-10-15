"use client";

import { useEffect } from "react";

import { MOBILE_LANDSCAPE_QUERY } from "@/lib/mobileLandscape";

/**
 * Portrait watch uses `viewport-fit=cover` like For You so the header and
 * bottom nav get real safe-area padding. Landscape watch uses `auto` so iOS
 * does not inset YouTube's video. Mutate the existing meta tag in place.
 */
function writeViewportFit(fit: "cover" | "auto") {
  const current = document.querySelector('meta[name="viewport"]');
  if (!(current instanceof HTMLMetaElement)) return;
  if (current.content.toLowerCase().includes(`viewport-fit=${fit}`)) return;
  const parts = current.content
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.toLowerCase().startsWith("viewport-fit"));
  parts.push(`viewport-fit=${fit}`);
  current.content = parts.join(", ");
}

export function WatchLandscapeViewportFit() {
  useEffect(() => {
    const orientation = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
    const apply = () => {
      writeViewportFit(orientation.matches ? "auto" : "cover");
    };
    apply();
    orientation.addEventListener("change", apply);
    return () => {
      orientation.removeEventListener("change", apply);
      writeViewportFit("cover");
    };
  }, []);

  return null;
}
