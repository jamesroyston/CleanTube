"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  CleanTubeLogoMark,
  type CleanTubeLogoVariant,
} from "@/components/logo/CleanTubeLogoMark";

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type CleanTubeLogoProps = {
  size?: number;
  /** Repeat subtle wave motion (e.g. home hero). Wave variant only. */
  repeat?: boolean;
  variant?: CleanTubeLogoVariant;
};

export function CleanTubeLogo({
  size = 40,
  repeat = false,
  variant = "wave",
}: CleanTubeLogoProps) {
  const [cycle, setCycle] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (!repeat || reducedMotion || variant !== "wave") return;
    const id = window.setInterval(() => setCycle((c) => c + 1), 4000);
    return () => window.clearInterval(id);
  }, [repeat, reducedMotion, variant]);

  return (
    <CleanTubeLogoMark
      key={cycle}
      size={size}
      variant={variant}
      animate={repeat}
      reducedMotion={reducedMotion}
    />
  );
}

export type { CleanTubeLogoVariant } from "@/components/logo/CleanTubeLogoMark";
export {
  CleanTubeLogoMark,
  LOGO_VARIANT_LABELS,
} from "@/components/logo/CleanTubeLogoMark";
