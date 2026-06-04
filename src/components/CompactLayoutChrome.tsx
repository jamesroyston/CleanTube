"use client";

import type { ReactNode } from "react";

import { ScrollRevealHeader } from "@/components/ScrollRevealHeader";

type CompactLayoutChromeProps = {
  showBottomNav: boolean;
  bottomNav: ReactNode;
};

/** Shared scroll-reveal controller + optional bottom app bar. */
export function CompactLayoutChrome({
  showBottomNav,
  bottomNav,
}: CompactLayoutChromeProps) {
  return (
    <>
      <ScrollRevealHeader />
      {showBottomNav ? bottomNav : null}
    </>
  );
}
