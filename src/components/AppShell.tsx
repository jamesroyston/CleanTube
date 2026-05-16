"use client";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Suspense, useLayoutEffect, useRef, useState } from "react";

import { useLibrarySidebarCollapsed } from "@/app/providers";
import {
  CHANNELS_COLLAPSED_DRAWER_WIDTH,
  CHANNELS_DRAWER_WIDTH,
  ChannelsRailContent,
  drawerRailTransition,
} from "@/components/ChannelsSidebar";
import { Header } from "@/components/Header";
import { SavedChannelMigration } from "@/components/SavedChannelMigration";

function HeaderFallback() {
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed: railCollapsed, setLibrarySidebarCollapsed } =
    useLibrarySidebarCollapsed();
  const desktopRailPx = mdUp
    ? railCollapsed
      ? CHANNELS_COLLAPSED_DRAWER_WIDTH
      : CHANNELS_DRAWER_WIDTH
    : null;

  const appBarRef = useRef<HTMLDivElement | null>(null);
  const [headerInsetPx, setHeaderInsetPx] = useState(72);

  useLayoutEffect(() => {
    const el = appBarRef.current;
    if (!el) return;
    function measure() {
      const node = appBarRef.current;
      if (!node) return;
      const bottom = Math.ceil(node.getBoundingClientRect().bottom);
      setHeaderInsetPx((prev) => (bottom > 0 ? bottom : prev));
    }
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);


  /** When `mdUp`, treat the rail as desktop-only (`open` gated so we never show the mobile Drawer on `md`). */
  const temporaryOpen = mdUp ? false : mobileOpen;

  const headerLeading = (
    <IconButton
      color="inherit"
      edge="start"
      aria-label={
        mdUp
          ? railCollapsed
            ? "Expand library sidebar"
            : "Collapse library sidebar"
          : mobileOpen
            ? "Close library drawer"
            : "Open library drawer"
      }
      onClick={() => {
        if (mdUp) setLibrarySidebarCollapsed(!railCollapsed);
        else setMobileOpen((open) => !open);
      }}
    >
      <MenuIcon />
    </IconButton>
  );

  const railTransition = drawerRailTransition(theme);

  /**
   * Desktop: single inner scroll region (sidebar + split layout).
   * Mobile (esp. iOS Safari): nested `overflow: auto` under `overflow: hidden` + `100dvh`
   * often breaks momentum/touch scrolling — use native document scrolling instead.
   */
  const mainScroll = mdUp ? (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <SavedChannelMigration />
      {children}
    </Box>
  ) : (
    <Box sx={{ flex: 1, minHeight: 0 }}>
      <SavedChannelMigration />
      {children}
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        ...(mdUp
          ? {
              height: "100dvh",
              minHeight: 0,
              overflow: "hidden",
            }
          : {
              minHeight: "100dvh",
            }),
      }}
    >
      {mdUp ? (
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            height: `${headerInsetPx}px`,
            /** Reserves viewport space for browse `Header` (`position="fixed"`). */
          }}
        />
      ) : null}
      <Suspense fallback={<HeaderFallback />}>
        <Header
          ref={appBarRef}
          leading={headerLeading}
          browseLayout={
            desktopRailPx != null
              ? { mode: "desktopRailMini", railWidthPx: desktopRailPx }
              : { mode: "mobile" }
          }
        />
      </Suspense>

      {desktopRailPx != null ? (
        <Box
          sx={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            flexDirection: "row",
          }}
        >
          <Drawer
            variant="permanent"
            open
            slotProps={{
              docked: {
                sx: {
                  flex: `0 0 ${desktopRailPx}px`,
                  width: desktopRailPx,
                  minWidth: desktopRailPx,
                  maxWidth: desktopRailPx,
                  flexShrink: 0,
                  transition: railTransition,
                  boxSizing: "border-box",
                },
              },
              paper: {
                sx: {
                  boxSizing: "border-box",
                  position: "fixed",
                  overflow: "hidden",
                  whiteSpace: railCollapsed ? "nowrap" : "normal",
                  width: desktopRailPx,
                  minWidth: desktopRailPx,
                  maxWidth: desktopRailPx,
                  flex: "none",
                  borderRight: (t) => `1px solid ${t.palette.divider}`,
                  transition: railTransition,
                  top: 0,
                  height: "100dvh",
                  paddingTop: "env(safe-area-inset-top, 0px)",
                },
              },
            }}
          >
            <ChannelsRailContent
              miniMode={railCollapsed}
              onNavigate={() => {}}
            />
          </Drawer>

          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              transition: railTransition,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {mainScroll}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Drawer
            variant="temporary"
            open={temporaryOpen}
            onClose={() => setMobileOpen(false)}
            elevation={0}
            ModalProps={{
              keepMounted: true,
              /** Above browse `Header` (`zIndex.drawer + 1`): full viewport overlay incl. app bar */
              sx: {
                zIndex: (t) => t.zIndex.modal,
              },
            }}
            sx={{
              [`& .MuiDrawer-paper`]: {
                width: CHANNELS_DRAWER_WIDTH,
                boxSizing: "border-box",
                top: 0,
                bottom: 0,
                height: "100%",
                pt: "env(safe-area-inset-top, 0px)",
                borderRadius: 0,
                overflow: "hidden",
                borderRight: (t) => `1px solid ${t.palette.divider}`,
              },
            }}
          >
            <ChannelsRailContent
              miniMode={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </Drawer>

          <Box component="main" sx={{ flex: 1, minHeight: 0 }}>
            {mainScroll}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}
