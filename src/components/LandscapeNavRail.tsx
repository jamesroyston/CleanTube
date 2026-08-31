"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { CleanTubeLogo } from "@/components/CleanTubeLogo";
import { WatchHeaderBackButton } from "@/components/WatchHeaderBackButton";
import { useSearchOverlay } from "@/context/SearchOverlayContext";
import { useWatchBackTarget } from "@/hooks/useWatchBackTarget";
import {
  LANDSCAPE_RAIL_INSET,
  MOBILE_LANDSCAPE,
  SAFE_BOTTOM,
  SAFE_RIGHT,
  SAFE_TOP,
} from "@/lib/mobileLandscape";
import { bottomNavValueFromPathname } from "@/lib/mobileNavRoutes";
import { stopActiveWatchPlayer } from "@/lib/watchPlayerLifecycle";

const RAIL_BUTTON_SX = {
  width: 48,
  height: 48,
  flexShrink: 0,
  /** Remove the synthetic tap delay so the first tap navigates immediately. */
  touchAction: "manipulation",
} as const;

/**
 * Phone landscape nav: icon-only rail pinned to the right edge, replacing the app
 * bar and bottom nav. Always mounted in the touch shell and revealed by media
 * query so rotation never waits on React.
 */
export function LandscapeNavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { openSearchOverlay } = useSearchOverlay();
  const watchBack = useWatchBackTarget();
  const active = bottomNavValueFromPathname(pathname);

  return (
    <Box
      component="nav"
      aria-label="Landscape navigation"
      data-landscape-rail
      sx={{
        display: "none",
        [MOBILE_LANDSCAPE]: {
          display: "flex",
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          /** Notch on the right: rail widens so icons clear it, background still reaches the edge. */
          width: LANDSCAPE_RAIL_INSET,
          pr: SAFE_RIGHT,
          pt: SAFE_TOP,
          pb: SAFE_BOTTOM,
          boxSizing: "border-box",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
          py: 0.5,
          bgcolor: "background.paper",
          borderLeft: (t) => `1px solid ${t.palette.divider}`,
          zIndex: (t) => t.zIndex.drawer + 2,
          overflowY: "auto",
          overscrollBehavior: "contain",
        },
      }}
    >
      <Box
        sx={{
          /** Fill the icon column exactly; a fixed 56px overflows the 1px left border. */
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {watchBack ? (
          /** Back button carries a toolbar `edge="start"` margin; center it in the rail. */
          <Box
            sx={{
              display: "flex",
              "& .MuiIconButton-root": { ml: 0, mr: 0 },
            }}
          >
            <WatchHeaderBackButton target={watchBack} />
          </Box>
        ) : null}

        <Tooltip title="Home" placement="left">
          <IconButton
            component={Link}
            href="/"
            prefetch
            scroll={false}
            aria-label="Home"
            aria-current={active === "home" ? "page" : undefined}
            onClick={() => stopActiveWatchPlayer()}
            sx={RAIL_BUTTON_SX}
          >
            <CleanTubeLogo size={28} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Library" placement="left">
          <IconButton
            aria-label="Library"
            aria-current={active === "library" ? "page" : undefined}
            color={active === "library" ? "primary" : "default"}
            onClick={() => router.push("/library")}
            sx={RAIL_BUTTON_SX}
          >
            <VideoLibraryOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Search" placement="left">
          <IconButton
            aria-label="Search"
            aria-haspopup="dialog"
            onClick={() => openSearchOverlay()}
            sx={RAIL_BUTTON_SX}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Account" placement="left">
          <IconButton
            aria-label="Account"
            aria-current={active === "account" ? "page" : undefined}
            color={active === "account" ? "primary" : "default"}
            onClick={() => {
              if (!pathname.startsWith("/auth")) router.push("/account");
            }}
            sx={RAIL_BUTTON_SX}
          >
            <AccountCircleOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
