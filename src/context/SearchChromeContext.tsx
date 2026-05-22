"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type SearchChromeContextValue = {
  openSearchOverlay: () => void;
  registerOpenSearchOverlay: (fn: (() => void) | null) => void;
};

const SearchChromeContext = createContext<SearchChromeContextValue | null>(
  null,
);

export function SearchChromeProvider({ children }: { children: ReactNode }) {
  const openRef = useRef<(() => void) | null>(null);

  const registerOpenSearchOverlay = useCallback((fn: (() => void) | null) => {
    openRef.current = fn;
  }, []);

  const openSearchOverlay = useCallback(() => {
    openRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ openSearchOverlay, registerOpenSearchOverlay }),
    [openSearchOverlay, registerOpenSearchOverlay],
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
