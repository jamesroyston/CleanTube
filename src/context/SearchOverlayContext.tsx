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

type SearchOverlayContextValue = {
  searchOverlayOpen: boolean;
  setSearchOverlayOpen: (open: boolean) => void;
  openSearchOverlay: () => void;
  registerOpenSearchOverlay: (fn: (() => void) | null) => void;
};

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(
  null,
);

export function SearchOverlayProvider({ children }: { children: ReactNode }) {
  const openRef = useRef<(() => void) | null>(null);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  const registerOpenSearchOverlay = useCallback((fn: (() => void) | null) => {
    openRef.current = fn;
  }, []);

  const openSearchOverlay = useCallback(() => {
    openRef.current?.();
  }, []);

  const value = useMemo(
    () => ({
      searchOverlayOpen,
      setSearchOverlayOpen,
      openSearchOverlay,
      registerOpenSearchOverlay,
    }),
    [openSearchOverlay, registerOpenSearchOverlay, searchOverlayOpen],
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
