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
import { BOTTOM_NAV_HEIGHT_PX } from "@/lib/compactLayout";
import { MOBILE_LANDSCAPE } from "@/lib/mobileLandscape";
import { bottomNavValueFromPathname } from "@/lib/mobileNavRoutes";

const PREFETCH_ROUTES = ["/", "/library", "/account", "/history", "/watch-later"] as const;

export function MobileBottomNav() {
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
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        top: "auto",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.drawer,
        pb: "env(safe-area-inset-bottom, 0px)",
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
            router.push("/");
            return;
          }
          if (next === "library") {
            router.push("/library");
            return;
          }
          if (next === "account" && !pathname.startsWith("/auth")) {
            router.push("/account");
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
