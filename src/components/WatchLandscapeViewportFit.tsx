"use client";

import { useEffect } from "react";

import { MOBILE_LANDSCAPE_QUERY } from "@/lib/mobileLandscape";

/**
 * Other sites' YouTube embeds work in iOS landscape because they don't use
 * `viewport-fit=cover`. With cover on, WebKit insets the <video> inside
 * YouTube's iframe (left black bar) while the player chrome still fills the
 * iframe. Drop cover only while this watch page is in phone landscape.
 */
function writeViewportFit(fit: "cover" | "auto") {
  const current = document.querySelector('meta[name="viewport"]');
  if (!(current instanceof HTMLMetaElement)) return;
  const parts = current.content
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.toLowerCase().startsWith("viewport-fit"));
  parts.push(`viewport-fit=${fit}`);
  const next = document.createElement("meta");
  next.name = "viewport";
  next.content = parts.join(", ");
  current.replaceWith(next);
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
