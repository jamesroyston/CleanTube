"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LightModeIcon from "@mui/icons-material/LightMode";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import PaletteIcon from "@mui/icons-material/Palette";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useThemeMode, useWatchLayout } from "@/app/providers";
import type { WatchLayoutMode } from "@/lib/watchLayoutPersistence";
import { ThemePresetDialog } from "@/components/ThemePresetPanel";
import { useCloudLibrary } from "@/context/CloudLibraryContext";

export function AccountMenu() {
  const { user, isCloudConfigured, signOutUser, authStatus } = useCloudLibrary();
  const { mode, toggleMode } = useThemeMode();
  const { mode: watchLayout, setWatchLayoutMode } = useWatchLayout();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          aria-label="Account"
          color="inherit"
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <AccountCircleOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem component={Link} href="/history" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <HistoryOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>History</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/watch-later" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <WatchLaterOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Watch Later</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/library" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <ViewColumnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Manage saved channels"
            secondary="Pins, searches, and removals"
          />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            toggleMode();
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            {mode === "dark" ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setPaletteOpen(true);
          }}
        >
          <ListItemIcon>
            <PaletteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Theme palette</ListItemText>
        </MenuItem>
        <ListSubheader
          disableSticky
          sx={{
            px: 2,
            py: 0.5,
            lineHeight: 1.5,
            typography: "caption",
            color: "text.secondary",
          }}
        >
          Watch layout
        </ListSubheader>
        {(
          [
            {
              value: "up_next",
              label: "Standard + Up next",
              secondary: "Related videos in the right column",
            },
            {
              value: "theatre",
              label: "Theatre",
              secondary: "Standard page width; player sized to fit the viewport",
            },
          ] as const
        ).map((opt) => (
          <MenuItem
            key={opt.value}
            selected={watchLayout === opt.value}
            onClick={() => {
              setWatchLayoutMode(opt.value);
              setAnchorEl(null);
              startTransition(() => {
                router.refresh();
              });
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {watchLayout === opt.value ? (
                <CheckIcon fontSize="small" color="primary" />
              ) : (
                <Box sx={{ width: 24 }} />
              )}
            </ListItemIcon>
            <ListItemText primary={opt.label} secondary={opt.secondary} />
          </MenuItem>
        ))}
        <Divider />
        {!isCloudConfigured ? (
          <MenuItem disabled>
            <ListItemIcon>
              <CloudOffOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Cloud sync unavailable"
              secondary="Set Supabase env vars to enable auth."
            />
          </MenuItem>
        ) : user ? (
          [
            <MenuItem key="account-state" disabled>
              <ListItemIcon>
                <CloudDoneOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={user.email ?? "Signed in"}
                secondary="Library sync is enabled"
              />
            </MenuItem>,
            <MenuItem
              key="passkeys"
              component={Link}
              href="/auth"
              onClick={() => setAnchorEl(null)}
            >
              <ListItemIcon>
                <FingerprintOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Passkeys & account"
                secondary="Sign-in options and device passkeys"
              />
            </MenuItem>,
            <MenuItem
              key="sign-out"
              onClick={() => {
                void signOutUser();
                setAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <LogoutOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign out</ListItemText>
            </MenuItem>,
          ]
        ) : (
          <MenuItem
            component={Link}
            href="/auth"
            onClick={() => setAnchorEl(null)}
            disabled={authStatus === "loading"}
          >
            <ListItemIcon>
              <LoginOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Sign in or create account"
              secondary="Sync library across devices"
            />
          </MenuItem>
        )}
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: "block", maxWidth: 280 }}>
          Logged-out users keep local-only storage. Signing in merges local library data into the cloud.
        </Typography>
      </Menu>
      <ThemePresetDialog
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
