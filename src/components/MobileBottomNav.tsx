"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { useTheme } from "@mui/material/styles";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSearchOverlay } from "@/context/SearchOverlayContext";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { navigateAppPath } from "@/lib/appShellNavigation";
import { BOTTOM_NAV_HEIGHT_PX } from "@/lib/compactLayout";
import { CT_SAFE_BOTTOM, MOBILE_LANDSCAPE } from "@/lib/mobileLandscape";
import { bottomNavValueFromPathname } from "@/lib/mobileNavRoutes";
import { stopActiveWatchPlayer } from "@/lib/watchPlayerLifecycle";

const PREFETCH_ROUTES = ["/", "/library", "/account", "/history", "/watch-later"] as const;

type MobileBottomNavProps = {
  /**
   * In an installed app shell the bar is the last row of a viewport-sized flex
   * column rather than a fixed overlay, so iOS can never drift it up the page.
   */
  inFlow?: boolean;
};

export function MobileBottomNav({ inFlow = false }: MobileBottomNavProps) {
  const theme = useTheme();
  const compact = useCompactViewport();
  const pathname = usePathname();
  const router = useRouter();
  const { openSearchOverlay, searchOverlayOpen } = useSearchOverlay();
  const value = bottomNavValueFromPathname(pathname);

  useEffect(() => {
    for (const href of PREFETCH_ROUTES) {
      void router.prefetch(href);
    }
  }, [router]);

  if (!compact || searchOverlayOpen) return null;

  return (
    <AppBar
      position={inFlow ? "static" : "fixed"}
      color="default"
      elevation={0}
      sx={{
        ...(inFlow
          ? { flexShrink: 0 }
          : { top: "auto", bottom: 0, left: 0, right: 0 }),
        zIndex: theme.zIndex.drawer,
        pb: CT_SAFE_BOTTOM,
        boxSizing: "border-box",
        /** Landscape moves nav to the right-edge rail. */
        [MOBILE_LANDSCAPE]: { display: "none" },
      }}
    >
      <BottomNavigation
        value={value}
        showLabels
        sx={{
          height: BOTTOM_NAV_HEIGHT_PX,
          bgcolor: "background.paper",
          borderTop: (t) => `1px solid ${t.vars.palette.divider}`,
          /** Remove the synthetic tap delay so the first tap navigates immediately. */
          "& .MuiButtonBase-root": { touchAction: "manipulation" },
        }}
        onChange={(_, next) => {
          if (next === "search") {
            openSearchOverlay();
            return;
          }
          if (next === "home") {
            stopActiveWatchPlayer();
            navigateAppPath(router, "/", pathname);
            return;
          }
          if (next === "library") {
            stopActiveWatchPlayer();
            navigateAppPath(router, "/library", pathname);
            return;
          }
          if (next === "account" && !pathname.startsWith("/auth")) {
            stopActiveWatchPlayer();
            navigateAppPath(router, "/account", pathname);
          }
        }}
      >
        <BottomNavigationAction
          label="Home"
          value="home"
          icon={<HomeOutlinedIcon />}
        />
        <BottomNavigationAction
          label="Library"
          value="library"
          icon={<VideoLibraryOutlinedIcon />}
        />
        <BottomNavigationAction
          label="Search"
          value="search"
          icon={<SearchIcon />}
        />
        <BottomNavigationAction
          label="Account"
          value="account"
          icon={<AccountCircleOutlinedIcon />}
        />
      </BottomNavigation>
    </AppBar>
  );
}
