"use client";

import LinearProgress from "@mui/material/LinearProgress";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type NavigationProgressContextValue = {
  start: () => void;
  done: () => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);

  const start = useCallback(() => {
    setPending(true);
  }, []);

  const done = useCallback(() => {
    setPending(false);
  }, []);

  const value = useMemo(() => ({ start, done }), [done, start]);

  return (
    <NavigationProgressContext.Provider value={value}>
      {pending ? (
        <LinearProgress
          aria-label="Loading search results"
          sx={{
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 2000,
          }}
        />
      ) : null}
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const value = useContext(NavigationProgressContext);
  if (!value) {
    throw new Error(
      "useNavigationProgress must be used within NavigationProgressProvider",
    );
  }
  return value;
}
