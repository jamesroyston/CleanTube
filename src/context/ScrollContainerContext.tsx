"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  type RefObject,
} from "react";

type ScrollContainerContextValue = {
  scrollRef: RefObject<HTMLElement | null>;
  /** Mobile uses window scroll; desktop uses the AppShell inner scroller. */
  getScrollElement: () => HTMLElement | Window | null;
};

const ScrollContainerContext = createContext<ScrollContainerContextValue | null>(
  null,
);

export function ScrollContainerProvider({
  scrollRef,
  mobileDocumentScroll,
  children,
}: {
  scrollRef: RefObject<HTMLElement | null>;
  mobileDocumentScroll: boolean;
  children: ReactNode;
}) {
  const value = useMemo<ScrollContainerContextValue>(
    () => ({
      scrollRef,
      getScrollElement: () =>
        mobileDocumentScroll
          ? typeof window !== "undefined"
            ? window
            : null
          : scrollRef.current,
    }),
    [mobileDocumentScroll, scrollRef],
  );

  return (
    <ScrollContainerContext.Provider value={value}>
      {children}
    </ScrollContainerContext.Provider>
  );
}

export function useScrollContainer() {
  const ctx = useContext(ScrollContainerContext);
  if (!ctx) {
    throw new Error(
      "useScrollContainer must be used within ScrollContainerProvider",
    );
  }
  return ctx;
}
