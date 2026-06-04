"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type SearchOverlayContextValue = {
  openSearchOverlay: () => void;
  registerOpenSearchOverlay: (fn: (() => void) | null) => void;
};

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(
  null,
);

export function SearchOverlayProvider({ children }: { children: ReactNode }) {
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
    <SearchOverlayContext.Provider value={value}>
      {children}
    </SearchOverlayContext.Provider>
  );
}

export function useSearchOverlay() {
  const ctx = useContext(SearchOverlayContext);
  if (!ctx) {
    throw new Error(
      "useSearchOverlay must be used within SearchOverlayProvider",
    );
  }
  return ctx;
}
