"use client";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import {
  ChannelsSidebar,
  CHANNELS_COLLAPSED_DRAWER_WIDTH,
  CHANNELS_DRAWER_WIDTH,
} from "@/components/ChannelsSidebar";
import { Header } from "@/components/Header";

function HeaderFallback() {
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));
  const mobileLandscape = useMediaQuery(
    "(max-width:899px) and (orientation: landscape)",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const desktopDrawerWidth = desktopCollapsed
    ? CHANNELS_COLLAPSED_DRAWER_WIDTH
    : CHANNELS_DRAWER_WIDTH;
  const hideBrowseChrome =
    pathname.startsWith("/watch/") && !mdUp && mobileLandscape;

  const headerLeading = (
    <IconButton
      color="inherit"
      edge="start"
      aria-label={mdUp ? "Toggle library drawer" : "Open library drawer"}
      onClick={() => {
        if (mdUp) {
          setDesktopCollapsed((value) => !value);
        } else {
          setMobileOpen(true);
        }
      }}
    >
      <MenuIcon />
    </IconButton>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: hideBrowseChrome ? "100dvh" : "100vh",
        overflow: hideBrowseChrome ? "hidden" : undefined,
      }}
    >
      {!hideBrowseChrome ? (
        <ChannelsSidebar
          variant={mdUp ? "permanent" : "temporary"}
          open={mdUp || mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={mdUp && desktopCollapsed}
        />
      ) : null}
      <Box
        component="div"
        sx={{
          flexGrow: 1,
          width:
            mdUp && !hideBrowseChrome
              ? `calc(100% - ${desktopDrawerWidth}px)`
              : "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!hideBrowseChrome ? (
          <Suspense fallback={<HeaderFallback />}>
            <Header leading={headerLeading} />
          </Suspense>
        ) : null}
        {children}
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}
