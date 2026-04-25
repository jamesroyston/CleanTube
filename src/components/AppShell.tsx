"use client";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Suspense, useState } from "react";

import {
  ChannelsSidebar,
  CHANNELS_DRAWER_WIDTH,
} from "@/components/ChannelsSidebar";
import { Header } from "@/components/Header";

function HeaderFallback() {
  return null;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const headerLeading =
    !mdUp ? (
      <IconButton
        color="inherit"
        edge="start"
        aria-label="Open saved channels"
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
      </IconButton>
    ) : null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <ChannelsSidebar
        variant={mdUp ? "permanent" : "temporary"}
        open={mdUp || mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        component="div"
        sx={{
          flexGrow: 1,
          width: mdUp ? `calc(100% - ${CHANNELS_DRAWER_WIDTH}px)` : "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Suspense fallback={<HeaderFallback />}>
          <Header leading={headerLeading} />
        </Suspense>
        {children}
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}
