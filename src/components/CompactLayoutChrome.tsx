"use client";

import Box from "@mui/material/Box";
import { useEffect, type ReactNode } from "react";

import { LandscapeNavRail } from "@/components/LandscapeNavRail";
import { ScrollRevealHeader } from "@/components/ScrollRevealHeader";
import { syncLandscapeIslandSide } from "@/lib/mobileLandscape";

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
    syncLandscapeIslandSide();
    const onChange = () => syncLandscapeIslandSide();
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("resize", onChange);
    window.screen?.orientation?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("resize", onChange);
      window.screen?.orientation?.removeEventListener?.("change", onChange);
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
