"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { setCompactLayoutHintAction } from "@/app/actions/compactLayoutHint";
import {
  compactLayoutHintToCookieValue,
  type CompactLayoutHint,
  DEFAULT_COMPACT_LAYOUT_HINT,
} from "@/lib/compactLayoutHint";
import {
  useCompactViewport,
  useShowBottomNav,
  useTouchPrimaryDevice,
} from "@/hooks/useCompactViewport";

const CompactLayoutContext = createContext<CompactLayoutHint>(
  DEFAULT_COMPACT_LAYOUT_HINT,
);

function CompactLayoutHintSync({ initialHint }: { initialHint: CompactLayoutHint }) {
  const compactViewport = useCompactViewport();
  const touchPrimary = useTouchPrimaryDevice();
  const mobileExperience = useShowBottomNav();

  const measured: CompactLayoutHint = useMemo(
    () => ({
      compactViewport,
      touchPrimary,
      mobileExperience,
    }),
    [compactViewport, mobileExperience, touchPrimary],
  );

  useEffect(() => {
    const next = compactLayoutHintToCookieValue(measured);
    const initial = compactLayoutHintToCookieValue(initialHint);
    if (next === initial) return;
    void setCompactLayoutHintAction(measured);
  }, [initialHint, measured]);

  return null;
}

export function CompactLayoutProvider({
  children,
  initialHint,
}: {
  children: ReactNode;
  initialHint: CompactLayoutHint;
}) {
  return (
    <CompactLayoutContext.Provider value={initialHint}>
      <CompactLayoutHintSync initialHint={initialHint} />
      {children}
    </CompactLayoutContext.Provider>
  );
}

/** SSR / first-paint defaults for `useMediaQuery` in compact layout hooks. */
export function useCompactLayoutHint(): CompactLayoutHint {
  return useContext(CompactLayoutContext);
}
