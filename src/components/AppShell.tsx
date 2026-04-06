"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MenuIcon from "@mui/icons-material/Menu";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Suspense, useState } from "react";

import {
  ChannelsSidebar,
  CHANNELS_DRAWER_WIDTH,
} from "@/components/ChannelsSidebar";
import { Header } from "@/components/Header";
import { SavedChannelsProvider } from "@/context/SavedChannelsContext";
import { WatchLaterProvider } from "@/context/WatchLaterContext";

function HeaderFallback() {
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const mdUp = useMediaQuery((t) => t.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopLibraryOpen, setDesktopLibraryOpen] = useState(true);

  const mobileSidebarButton = !mdUp ? (
    <IconButton
      color="inherit"
      edge="start"
      aria-label="Open library"
      onClick={() => setMobileOpen(true)}
    >
      <MenuIcon />
    </IconButton>
  ) : null;

  const desktopLibraryToggle = mdUp ? (
    <IconButton
      color="inherit"
      edge="start"
      aria-label={desktopLibraryOpen ? "Hide library" : "Show library"}
      onClick={() => setDesktopLibraryOpen((v) => !v)}
      sx={{ mr: 0.5 }}
    >
      {desktopLibraryOpen ? <ChevronLeftIcon /> : <ViewSidebarIcon />}
    </IconButton>
  ) : null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <ChannelsSidebar
        variant={mdUp ? "persistent" : "temporary"}
        open={mdUp ? desktopLibraryOpen : mobileOpen}
        onClose={() =>
          mdUp ? setDesktopLibraryOpen(false) : setMobileOpen(false)
        }
      />
      <Box
        component="div"
        sx={{
          flexGrow: 1,
          width:
            mdUp && desktopLibraryOpen
              ? `calc(100% - ${CHANNELS_DRAWER_WIDTH}px)`
              : "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Suspense fallback={<HeaderFallback />}>
          <Header
            leading={mobileSidebarButton}
            desktopLibraryToggle={desktopLibraryToggle}
          />
        </Suspense>
        {children}
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SavedChannelsProvider>
      <WatchLaterProvider>
        <AppShellInner>{children}</AppShellInner>
      </WatchLaterProvider>
    </SavedChannelsProvider>
  );
}
