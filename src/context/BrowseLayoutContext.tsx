"use client";

import type { ReactNode } from "react";

import { HeaderScrollProvider } from "@/context/HeaderScrollContext";
import { SearchOverlayProvider } from "@/context/SearchOverlayContext";

/** Browse UI providers: search overlay bridge + scroll-reveal header state. */
export function BrowseLayoutProvider({ children }: { children: ReactNode }) {
  return (
    <SearchOverlayProvider>
      <HeaderScrollProvider>{children}</HeaderScrollProvider>
    </SearchOverlayProvider>
  );
}

export { useHeaderScroll } from "@/context/HeaderScrollContext";
export { useSearchOverlay } from "@/context/SearchOverlayContext";
