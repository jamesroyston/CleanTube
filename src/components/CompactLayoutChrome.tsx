"use client";

import Box from "@mui/material/Box";
import { useEffect, type ReactNode } from "react";

import { LandscapeNavRail } from "@/components/LandscapeNavRail";
import { ScrollRevealHeader } from "@/components/ScrollRevealHeader";
import { settlePortraitViewport, syncMobileSafeArea } from "@/lib/mobileLandscape";

type CompactLayoutChromeProps = {
  showBottomNav: boolean;
  bottomNav: ReactNode;
};

/** Shared scroll-reveal controller + optional bottom app bar / landscape rail. */
export function CompactLayoutChrome({
  showBottomNav,
  bottomNav,
}: CompactLayoutChromeProps) {
  useEffect(() => {
    syncMobileSafeArea();
    const timers: number[] = [];
    const onResize = () => syncMobileSafeArea();
    const onOrientation = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.length = 0;
      settlePortraitViewport();
      for (const delay of [50, 150, 400]) {
        timers.push(window.setTimeout(settlePortraitViewport, delay));
      }
    };
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("resize", onResize);
    window.screen?.orientation?.addEventListener?.("change", onOrientation);
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("resize", onResize);
      window.screen?.orientation?.removeEventListener?.("change", onOrientation);
    };
  }, []);

  return (
    <>
      <ScrollRevealHeader />
      {showBottomNav ? (
        <>
          <Box component="span" data-mobile-chrome sx={{ display: "contents" }}>
            {bottomNav}
          </Box>
          <LandscapeNavRail />
        </>
      ) : null}
    </>
  );
}
