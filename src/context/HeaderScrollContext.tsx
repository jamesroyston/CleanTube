"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HeaderScrollContextValue = {
  /** 0 = hidden, 1 = fully revealed (compact viewport scroll-reveal). */
  headerRevealProgress: number;
  setHeaderRevealProgress: (progress: number) => void;
  /** True when scrollY is past the in-flow header threshold. */
  headerOverlayActive: boolean;
  setHeaderOverlayActive: (active: boolean) => void;
};

const HeaderScrollContext = createContext<HeaderScrollContextValue | null>(null);

export function HeaderScrollProvider({ children }: { children: ReactNode }) {
  const [headerRevealProgress, setHeaderRevealProgress] = useState(0);
  const [headerOverlayActive, setHeaderOverlayActive] = useState(false);

  const value = useMemo(
    () => ({
      headerRevealProgress,
      setHeaderRevealProgress,
      headerOverlayActive,
      setHeaderOverlayActive,
    }),
    [headerRevealProgress, headerOverlayActive],
  );

  return (
    <HeaderScrollContext.Provider value={value}>
      {children}
    </HeaderScrollContext.Provider>
  );
}

export function useHeaderScroll() {
  const ctx = useContext(HeaderScrollContext);
  if (!ctx) {
    throw new Error("useHeaderScroll must be used within HeaderScrollProvider");
  }
  return ctx;
}
