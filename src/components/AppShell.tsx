"use client";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Suspense, useMemo, useState } from "react";

import { useLibrarySidebarCollapsed } from "@/app/providers";
import { ChannelsSidebar } from "@/components/ChannelsSidebar";
import { Header } from "@/components/Header";
import { SavedChannelMigration } from "@/components/SavedChannelMigration";

function HeaderFallback() {
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));
  const smUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed: desktopCollapsed, setLibrarySidebarCollapsed } =
    useLibrarySidebarCollapsed();

  const toolbarOffset = useMemo(() => {
    const raw = theme.mixins.toolbar.minHeight;
    if (typeof raw === "number") return raw;
    return smUp ? 64 : 56;
  }, [smUp, theme.mixins.toolbar.minHeight]);

  const headerLeading = (
    <IconButton
      color="inherit"
      edge="start"
      aria-label={
        mdUp ? "Toggle library rail" : mobileOpen ? "Close library drawer" : "Open library drawer"
      }
      onClick={() => {
        if (mdUp) {
          setLibrarySidebarCollapsed(!desktopCollapsed);
        } else {
          setMobileOpen((open) => !open);
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
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Suspense fallback={<HeaderFallback />}>
        <Header leading={headerLeading} />
      </Suspense>
      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
        }}
      >
        <ChannelsSidebar
          surface="permanent"
          collapsed={desktopCollapsed}
          open
          onClose={() => {}}
          toolbarOffset={toolbarOffset}
        />
        <ChannelsSidebar
          surface="temporary"
          collapsed={false}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          toolbarOffset={toolbarOffset}
        />
        <Box
          component="div"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SavedChannelMigration />
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}
