"use client";

import LinearProgress from "@mui/material/LinearProgress";
import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type NavigationProgressContextValue = {
  start: () => void;
  done: () => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

function RouteProgressObserver({ done }: { done: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    done();
  }, [done, pathname, search]);

  return null;
}

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

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(done, 10_000);
    return () => window.clearTimeout(timeout);
  }, [done, pending]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }
      start();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  return (
    <NavigationProgressContext.Provider value={value}>
      {pending ? (
        <LinearProgress
          aria-label="Loading"
          sx={{
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 2000,
          }}
        />
      ) : null}
      <Suspense fallback={null}>
        <RouteProgressObserver done={done} />
      </Suspense>
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
