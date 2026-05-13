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
import ClearAllOutlinedIcon from "@mui/icons-material/ClearAllOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import PaletteIcon from "@mui/icons-material/Palette";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { setWatchCommentsVisibleAction } from "@/app/actions/watchCommentsVisibility";
import { parseWatchCommentsVisibleCookie } from "@/lib/watchCommentsVisibilityPersistence";
import { clearChannelPageSessionBackups } from "@/lib/channelPageClientCache";

import { useThemeMode, useWatchLayout } from "@/app/providers";
import { ThemePresetDialog } from "@/components/ThemePresetPanel";
import { useCloudLibrary } from "@/context/CloudLibraryContext";

function readWatchCommentsVisibleFromDocument(): boolean {
  if (typeof document === "undefined") return false;
  const m = document.cookie.match(
    /(?:^|; )cleantube-watch-comments-visible=([^;]*)/,
  );
  const raw = m?.[1] ? decodeURIComponent(m[1]) : undefined;
  return parseWatchCommentsVisibleCookie(raw);
}

/** Part before @ for compact app bar label; whole string if malformed. */
function emailLocalPart(email: string | undefined): string {
  if (!email?.trim()) return "";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email.trim();
}

export function AccountMenu() {
  const theme = useTheme();
  const compactAccount = useMediaQuery(theme.breakpoints.down("md"));
  const { user, isCloudConfigured, signOutUser, authStatus } = useCloudLibrary();
  const { mode, toggleMode } = useThemeMode();
  const { mode: watchLayout, setWatchLayoutMode } = useWatchLayout();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const open = Boolean(anchorEl);
  const commentsVisible = readWatchCommentsVisibleFromDocument();

  const accountLabel = user ? emailLocalPart(user.email ?? undefined) : "";
  const accountTooltip = user?.email?.trim() ?? "Account";

  return (
    <>
      <Tooltip title={accountTooltip}>
        <span>
          {user ? (
            compactAccount ? (
              <IconButton
                aria-label="Account"
                color="inherit"
                onClick={(event) => setAnchorEl(event.currentTarget)}
              >
                <AccountCircleOutlinedIcon />
              </IconButton>
            ) : (
              <Button
                aria-label="Account"
                color="inherit"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                startIcon={<AccountCircleOutlinedIcon />}
                sx={{
                  minWidth: 0,
                  maxWidth: 220,
                  textTransform: "none",
                  color: "text.primary",
                  px: 1,
                }}
              >
                <Typography variant="body2" component="span" noWrap sx={{ minWidth: 0 }}>
                  {accountLabel || "Account"}
                </Typography>
              </Button>
            )
          ) : (
            <IconButton
              aria-label="Account"
              color="inherit"
              onClick={(event) => setAnchorEl(event.currentTarget)}
            >
              <AccountCircleOutlinedIcon />
            </IconButton>
          )}
        </span>
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
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            void setWatchCommentsVisibleAction(!commentsVisible).then(() => {
              startTransition(() => {
                router.refresh();
              });
            });
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {commentsVisible ? (
              <CheckIcon fontSize="small" color="primary" />
            ) : (
              <Box sx={{ width: 24 }} />
            )}
          </ListItemIcon>
          <ListItemText
            primary="Show comments on watch"
            secondary="Turn off to skip loading comments (faster watch page)"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            clearChannelPageSessionBackups();
            startTransition(() => {
              router.refresh();
            });
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <ClearAllOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Clear channel page backups"
            secondary="Removes session-only cached channel grids in this browser (use if the grid looks stuck)."
          />
        </MenuItem>
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
          Signed-out browsing uses local storage on this device. Sign in to load your cloud library; sign out clears that local copy.
        </Typography>
      </Menu>
      <ThemePresetDialog
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
