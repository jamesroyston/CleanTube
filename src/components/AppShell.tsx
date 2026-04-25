"use client";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Suspense, useEffect, useState } from "react";

import {
  ChannelsSidebar,
  CHANNELS_COLLAPSED_DRAWER_WIDTH,
  CHANNELS_DRAWER_WIDTH,
} from "@/components/ChannelsSidebar";
import { Header } from "@/components/Header";
import { SavedChannelMigration } from "@/components/SavedChannelMigration";

function HeaderFallback() {
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const desktopDrawerWidth = desktopCollapsed
    ? CHANNELS_COLLAPSED_DRAWER_WIDTH
    : CHANNELS_DRAWER_WIDTH;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- delay responsive drawer markup until after hydration
    setMounted(true);
  }, []);

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
        minHeight: "100vh",
      }}
    >
      {mounted ? (
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
            mounted && mdUp ? `calc(100% - ${desktopDrawerWidth}px)` : "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Suspense fallback={<HeaderFallback />}>
          <Header leading={headerLeading} />
        </Suspense>
        <SavedChannelMigration />
        {children}
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}
