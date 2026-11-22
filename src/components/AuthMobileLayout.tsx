"use client";

import Box from "@mui/material/Box";
import { Suspense, useEffect } from "react";

import { CompactLayoutChrome } from "@/components/CompactLayoutChrome";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  useAppShellViewport,
  useCompactMainPaddingBottom,
} from "@/hooks/useAppShellViewport";
import { useShowBottomNav } from "@/hooks/useCompactViewport";
import { APP_SHELL_SCROLL_ATTR } from "@/lib/compactLayout";

function HeaderFallback() {
  return null;
}

export function AuthMobileLayout({ children }: { children: React.ReactNode }) {
  const showBottomNav = useShowBottomNav();
  const appShellViewport = useAppShellViewport();
  const mainPaddingBottom = useCompactMainPaddingBottom(24);

  useEffect(() => {
    if (!appShellViewport) return;
    const root = document.documentElement;
    root.setAttribute(APP_SHELL_SCROLL_ATTR, "1");
    return () => root.removeAttribute(APP_SHELL_SCROLL_ATTR);
  }, [appShellViewport]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        ...(appShellViewport
          ? { height: "100dvh", minHeight: 0, overflow: "hidden" }
          : { minHeight: ["100vh", "-webkit-fill-available", "100dvh"] }),
      }}
    >
      <Suspense fallback={<HeaderFallback />}>
        <Header showBottomNav={showBottomNav} />
      </Suspense>
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          pt: 3,
          pb: mainPaddingBottom ?? 3,
          boxSizing: "border-box",
          ...(appShellViewport
            ? { overflowY: "auto", overscrollBehavior: "contain" }
            : null),
        }}
      >
        {children}
      </Box>
      <CompactLayoutChrome
        showBottomNav={showBottomNav}
        bottomNav={<MobileBottomNav inFlow={appShellViewport} />}
      />
    </Box>
  );
}
