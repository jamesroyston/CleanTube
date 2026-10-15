"use client";

import { useEffect } from "react";

/**
 * `viewport-fit=cover` makes iOS inset YouTube's <video> (left black bar).
 * Keep cover off for the whole watch page so rotate doesn't retarget the
 * viewport (that left portrait chrome untappable). Restore cover on leave.
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
    writeViewportFit("auto");
    return () => writeViewportFit("cover");
  }, []);

  return null;
}
