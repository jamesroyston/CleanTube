"use client";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useLibrarySidebarCollapsed } from "@/app/providers";
import {
  CHANNELS_COLLAPSED_DRAWER_WIDTH,
  CHANNELS_DRAWER_WIDTH,
  ChannelsRailContent,
  drawerRailTransition,
} from "@/components/ChannelsSidebar";
import { BuildStampDebug } from "@/components/BuildStampDebug";
import { CompactLayoutChrome } from "@/components/CompactLayoutChrome";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SavedChannelMigration } from "@/components/SavedChannelMigration";
import { WatchReturnTracker } from "@/components/WatchReturnTracker";
import { ScrollContainerProvider } from "@/context/ScrollContainerContext";
import { useHeaderScroll } from "@/context/HeaderScrollContext";
import {
  compactMainPaddingBottom,
  useCompactViewport,
  useShowBottomNav,
} from "@/hooks/useCompactViewport";
import { useMobileExperience } from "@/hooks/useMobileExperience";
import {
  LANDSCAPE_RAIL_INSET,
  MOBILE_LANDSCAPE,
  SAFE_BOTTOM,
  SAFE_LEFT,
} from "@/lib/mobileLandscape";
import { registerScrollElementGetter } from "@/lib/watchReturnNavigation";

function HeaderFallback() {
  return null;
}

function AppShellDrawerPathSync({
  onPathChange,
}: {
  onPathChange: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onPathChange();
  }, [pathname, onPathChange]);

  return null;
}

/**
 * Toolbar minHeight (sm+) before ResizeObserver measures the fixed AppBar.
 * Safe-area is on the AppBar itself and included in measurement.
 */
const HEADER_INSET_FALLBACK_PX = 64;

function AppShellInner({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const compact = useCompactViewport();
  const mobileExperience = useMobileExperience();
  const desktopLayout = !compact;
  const { headerOverlayActive } = useHeaderScroll();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerHistoryPushedRef = useRef(false);
  const { collapsed: railCollapsed, setLibrarySidebarCollapsed } =
    useLibrarySidebarCollapsed();

  const closeMobileDrawer = useCallback((fromPopState = false) => {
    setMobileOpen(false);
    if (fromPopState) {
      drawerHistoryPushedRef.current = false;
      return;
    }
    if (drawerHistoryPushedRef.current) {
      drawerHistoryPushedRef.current = false;
      window.history.back();
    }
  }, []);

  /** Sidebar link navigation: close drawer without history.back (avoids canceling the route change). */
  const dismissMobileDrawerForNavigation = useCallback(() => {
    setMobileOpen(false);
    drawerHistoryPushedRef.current = false;
  }, []);

  const resetMobileDrawerOnNavigate = useCallback(() => {
    setMobileOpen(false);
    drawerHistoryPushedRef.current = false;
  }, []);

  const openMobileDrawer = useCallback(() => {
    setMobileOpen(true);
    if (!drawerHistoryPushedRef.current) {
      window.history.pushState(
        { cleantubeOverlay: "drawer" },
        "",
        window.location.href,
      );
      drawerHistoryPushedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (drawerHistoryPushedRef.current) {
        closeMobileDrawer(true);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeMobileDrawer]);
  const desktopRailPx = desktopLayout
    ? railCollapsed
      ? CHANNELS_COLLAPSED_DRAWER_WIDTH
      : CHANNELS_DRAWER_WIDTH
    : null;

  const appBarRef = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const [headerInsetPx, setHeaderInsetPx] = useState(HEADER_INSET_FALLBACK_PX);
  const reserveFixedHeaderSpace =
    !mobileExperience &&
    (desktopLayout || (!desktopLayout && headerOverlayActive));

  useEffect(() => {
    registerScrollElementGetter(() =>
      desktopLayout ? mainScrollRef.current : window,
    );
    return () => registerScrollElementGetter(null);
  }, [desktopLayout]);

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


  /** Desktop rail only when not in compact (mobile/touch) layout. */
  const temporaryOpen = desktopLayout ? false : mobileOpen;

  const headerLeading = mobileExperience ? null : (
    <IconButton
      color="inherit"
      edge="start"
      aria-label={
        desktopLayout
          ? railCollapsed
            ? "Expand library sidebar"
            : "Collapse library sidebar"
          : mobileOpen
            ? "Close library drawer"
            : "Open library drawer"
      }
      onClick={() => {
        if (desktopLayout) setLibrarySidebarCollapsed(!railCollapsed);
        else if (mobileOpen) closeMobileDrawer();
        else openMobileDrawer();
      }}
    >
      <MenuIcon />
    </IconButton>
  );

  const railTransition = drawerRailTransition(theme);
  const showBottomNav = useShowBottomNav();
  const mobileMainPaddingBottom = compactMainPaddingBottom(showBottomNav);

  /**
   * Desktop: single inner scroll region (sidebar + split layout).
   * Mobile (esp. iOS Safari): nested `overflow: auto` under `overflow: hidden` + `100dvh`
   * often breaks momentum/touch scrolling — use native document scrolling instead.
   */
  const mainScroll = desktopLayout ? (
    <Box
      ref={mainScrollRef}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Suspense fallback={null}>
        <SavedChannelMigration />
      </Suspense>
      {children}
    </Box>
  ) : (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        pb: mobileMainPaddingBottom,
        /**
         * Landscape: bottom nav is gone, so content only clears the right-edge rail
         * and whichever side the notch is on.
         */
        [MOBILE_LANDSCAPE]: {
          pb: SAFE_BOTTOM,
          pl: SAFE_LEFT,
          pr: LANDSCAPE_RAIL_INSET,
        },
      }}
    >
      <Suspense fallback={null}>
        <SavedChannelMigration />
      </Suspense>
      {children}
    </Box>
  );

  return (
    <ScrollContainerProvider
      scrollRef={mainScrollRef}
      mobileDocumentScroll={!desktopLayout}
    >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        ...(desktopLayout
          ? {
              height: "100dvh",
              minHeight: 0,
              overflow: "hidden",
            }
          : {
              minHeight: ["100vh", "-webkit-fill-available", "100dvh"],
            }),
      }}
    >
      <BuildStampDebug />
      <Suspense fallback={<HeaderFallback />}>
        <AppShellDrawerPathSync onPathChange={resetMobileDrawerOnNavigate} />
        <WatchReturnTracker />
        <Header
          ref={appBarRef}
          leading={headerLeading}
          showBottomNav={showBottomNav}
          browseLayout={
            desktopRailPx != null
              ? { mode: "desktopRailMini", railWidthPx: desktopRailPx }
              : { mode: "mobile" }
          }
        />
      </Suspense>
      <Box
        data-shell-content
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          flexDirection: "column",
          ...(reserveFixedHeaderSpace
            ? {
                /** Offset content below the fixed browse AppBar (live-measured height). */
                pt: `${headerInsetPx}px`,
              }
            : {}),
        }}
      >
      <CompactLayoutChrome
        showBottomNav={showBottomNav}
        bottomNav={
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        }
      />

      {desktopRailPx != null ? (
        <Box
          data-desktop-shell
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
          {!mobileExperience ? (
          <Drawer
            variant="temporary"
            open={temporaryOpen}
            onClose={() => closeMobileDrawer()}
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
              onNavigate={dismissMobileDrawerForNavigation}
            />
          </Drawer>
          ) : null}

          <Box component="main" sx={{ flex: 1, minHeight: 0 }}>
            {mainScroll}
          </Box>
        </Box>
      )}
      </Box>
    </Box>
    </ScrollContainerProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}
