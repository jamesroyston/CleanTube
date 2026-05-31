"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LightModeIcon from "@mui/icons-material/LightMode";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ClearAllOutlinedIcon from "@mui/icons-material/ClearAllOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { buildAuthPageHref } from "@/lib/authReturnNavigation";
import { clearChannelPageSessionBackups } from "@/lib/channelPageClientCache";

import {
  useThemeMode,
  useWatchCommentsVisible,
  useWatchNarrowPlayerLayout,
  useWatchUpNextVisible,
} from "@/app/providers";
import { useCloudLibrary } from "@/context/CloudLibraryContext";

function emailLocalPart(email: string | undefined): string {
  if (!email?.trim()) return "";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email.trim();
}

export function AccountMenu() {
  const theme = useTheme();
  const compactAccount = useMediaQuery(theme.breakpoints.down("md"));
  const { user, isCloudConfigured, canPersistLibrary, signOutUser, authStatus } = useCloudLibrary();
  const { mode, toggleMode } = useThemeMode();
  const { visible: commentsVisible, setWatchCommentsVisible } =
    useWatchCommentsVisible();
  const { visible: upNextVisible, setWatchUpNextVisible } =
    useWatchUpNextVisible();
  const { enabled: narrowPlayerLayout, setWatchNarrowPlayerLayout } =
    useWatchNarrowPlayerLayout();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authHref = useMemo(() => {
    const search = searchParams.toString();
    return buildAuthPageHref(pathname, search ? `?${search}` : undefined);
  }, [pathname, searchParams]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const signedInColor = user ? "success" : "inherit";
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
                color={signedInColor}
                onClick={(event) => setAnchorEl(event.currentTarget)}
              >
                <AccountCircleOutlinedIcon />
              </IconButton>
            ) : (
              <Button
                aria-label="Account"
                color="inherit"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                startIcon={
                  <AccountCircleOutlinedIcon sx={{ color: "success.main" }} />
                }
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
              color={signedInColor}
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
          Watch page
        </ListSubheader>
        <Box
          sx={{ px: 2, py: 1, maxWidth: 320 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <FormControlLabel
            sx={{
              m: 0,
              width: "100%",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1,
            }}
            label={
              <Box sx={{ pr: 1, pt: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Related videos column
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Up next rail (loads only when on)
                </Typography>
              </Box>
            }
            labelPlacement="start"
            control={
              <Switch
                size="small"
                checked={upNextVisible}
                onChange={(_, v) => setWatchUpNextVisible(v)}
                inputProps={{ "aria-label": "Show related videos column" }}
              />
            }
          />
        </Box>
        <Box
          sx={{ px: 2, py: 1, maxWidth: 320 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <FormControlLabel
            sx={{
              m: 0,
              width: "100%",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1,
            }}
            label={
              <Box sx={{ pr: 1, pt: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Narrow player layout
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Keeps a narrower video on large screens when Up next is off
                </Typography>
              </Box>
            }
            labelPlacement="start"
            control={
              <Switch
                size="small"
                checked={narrowPlayerLayout}
                onChange={(_, v) => setWatchNarrowPlayerLayout(v)}
                inputProps={{ "aria-label": "Narrow player layout on watch" }}
              />
            }
          />
        </Box>
        <Box
          sx={{ px: 2, py: 1, maxWidth: 320 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <FormControlLabel
            sx={{
              m: 0,
              width: "100%",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1,
            }}
            label={
              <Box sx={{ pr: 1, pt: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Comments
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Loads only when on (faster watch page when off)
                </Typography>
              </Box>
            }
            labelPlacement="start"
            control={
              <Switch
                size="small"
                checked={commentsVisible}
                onChange={(_, v) => setWatchCommentsVisible(v)}
                inputProps={{ "aria-label": "Show comments on watch" }}
              />
            }
          />
        </Box>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            clearChannelPageSessionBackups();
            router.refresh();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <ClearAllOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            sx={{ minWidth: 0, flex: 1 }}
            primary="Clear channel page backups"
            secondary="Clears session-only channel grid cache here if the grid looks stuck."
            secondaryTypographyProps={
              compactAccount
                ? {
                    noWrap: false,
                    sx: {
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    },
                  }
                : undefined
            }
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
              href={authHref}
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
            href={authHref}
            onClick={() => setAnchorEl(null)}
            disabled={authStatus === "loading"}
          >
            <ListItemIcon>
              <LoginOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Sign in or create account"
              secondary="Save your library across devices"
            />
          </MenuItem>
        )}
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: "block", maxWidth: 280 }}>
          {canPersistLibrary
            ? "Your library is saved to your account and syncs across devices."
            : "History, Watch Later, saved channels, and pinned searches require signing in."}
        </Typography>
      </Menu>
    </>
  );
}
