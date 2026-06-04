"use client";

import Box from "@mui/material/Box";
import { Suspense } from "react";

import { CompactLayoutChrome } from "@/components/CompactLayoutChrome";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  compactMainPaddingBottom,
  useShowBottomNav,
} from "@/hooks/useCompactViewport";

function HeaderFallback() {
  return null;
}

export function AuthMobileLayout({ children }: { children: React.ReactNode }) {
  const showBottomNav = useShowBottomNav();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <Suspense fallback={<HeaderFallback />}>
        <Header showBottomNav={showBottomNav} />
      </Suspense>
      <CompactLayoutChrome
        showBottomNav={showBottomNav}
        bottomNav={<MobileBottomNav />}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          pt: 3,
          pb: compactMainPaddingBottom(showBottomNav, 24) ?? 3,
          boxSizing: "border-box",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
