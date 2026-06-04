"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { useTheme } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { useSearchOverlay } from "@/context/SearchOverlayContext";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { BOTTOM_NAV_HEIGHT_PX } from "@/lib/compactLayout";

export type MobileBottomNavProps = {
  onOpenLibrary: () => void;
};

function navValueFromPathname(pathname: string): string | false {
  return pathname === "/" ? "home" : false;
}

export function MobileBottomNav({ onOpenLibrary }: MobileBottomNavProps) {
  const theme = useTheme();
  const mobile = useCompactViewport();
  const pathname = usePathname();
  const { openSearchOverlay } = useSearchOverlay();
  const [accountAnchorEl, setAccountAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [value, setValue] = useState<string | false>(() =>
    navValueFromPathname(pathname),
  );
  const [syncedPathname, setSyncedPathname] = useState(pathname);

  if (syncedPathname !== pathname) {
    setSyncedPathname(pathname);
    setValue(navValueFromPathname(pathname));
  }

  if (!mobile) return null;

  return (
    <>
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
        }}
      >
        <BottomNavigation
          value={value}
          showLabels
          sx={{
            height: BOTTOM_NAV_HEIGHT_PX,
            bgcolor: "var(--color-base-200)",
            borderTop: (t) => `1px solid ${t.palette.divider}`,
          }}
          onChange={(_, next) => {
            if (next === "library") {
              setValue(navValueFromPathname(pathname));
              onOpenLibrary();
              return;
            }
            if (next === "search") {
              setValue(navValueFromPathname(pathname));
              openSearchOverlay();
              return;
            }
            if (next === "account") {
              setValue(navValueFromPathname(pathname));
              return;
            }
            setValue(next);
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<HomeOutlinedIcon />}
            component={Link}
            href="/"
            onClick={() => setValue("home")}
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
            onClick={(event) => {
              setAccountAnchorEl(event.currentTarget);
            }}
          />
        </BottomNavigation>
      </AppBar>
      <AccountMenu
        hideTrigger
        anchorEl={accountAnchorEl}
        onAnchorClose={() => setAccountAnchorEl(null)}
        menuAnchorOrigin={{ vertical: "top", horizontal: "center" }}
        menuTransformOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
}
