"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SearchChromeContextValue = {
  openSearchOverlay: () => void;
  registerOpenSearchOverlay: (fn: (() => void) | null) => void;
  /** 0 = hidden, 1 = fully revealed — tied to scroll-up gesture. */
  mobileHeaderRevealProgress: number;
  setMobileHeaderRevealProgress: (progress: number) => void;
  /** True when scrollY is past the in-flow header threshold. */
  mobileHeaderOverlayMode: boolean;
  setMobileHeaderOverlayMode: (active: boolean) => void;
  /** False while the user is actively scrolling (enables CSS snap transitions). */
  mobileHeaderScrollSettled: boolean;
  setMobileHeaderScrollSettled: (settled: boolean) => void;
};

const SearchChromeContext = createContext<SearchChromeContextValue | null>(
  null,
);

export function SearchChromeProvider({ children }: { children: ReactNode }) {
  const openRef = useRef<(() => void) | null>(null);
  const [mobileHeaderRevealProgress, setMobileHeaderRevealProgress] =
    useState(0);
  const [mobileHeaderOverlayMode, setMobileHeaderOverlayMode] = useState(false);
  const [mobileHeaderScrollSettled, setMobileHeaderScrollSettled] =
    useState(true);

  const registerOpenSearchOverlay = useCallback((fn: (() => void) | null) => {
    openRef.current = fn;
  }, []);

  const openSearchOverlay = useCallback(() => {
    openRef.current?.();
  }, []);

  const value = useMemo(
    () => ({
      openSearchOverlay,
      registerOpenSearchOverlay,
      mobileHeaderRevealProgress,
      setMobileHeaderRevealProgress,
      mobileHeaderOverlayMode,
      setMobileHeaderOverlayMode,
      mobileHeaderScrollSettled,
      setMobileHeaderScrollSettled,
    }),
    [
      openSearchOverlay,
      registerOpenSearchOverlay,
      mobileHeaderRevealProgress,
      mobileHeaderOverlayMode,
      mobileHeaderScrollSettled,
    ],
  );

  return (
    <SearchChromeContext.Provider value={value}>
      {children}
    </SearchChromeContext.Provider>
  );
}

export function useSearchChrome() {
  const ctx = useContext(SearchChromeContext);
  if (!ctx) {
    throw new Error("useSearchChrome must be used within SearchChromeProvider");
  }
  return ctx;
}
