"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { buildAuthPageHref } from "@/lib/authReturnNavigation";

import { useCloudLibrary } from "@/context/CloudLibraryContext";

function emailLocalPart(email: string | undefined): string {
  if (!email?.trim()) return "";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email.trim();
}

export type AccountMenuProps = {
  /** Controlled anchor; when set, menu open state follows this element. */
  anchorEl?: HTMLElement | null;
  onAnchorClose?: () => void;
  hideTrigger?: boolean;
  menuAnchorOrigin?: {
    vertical: "top" | "bottom" | "center";
    horizontal: "left" | "right" | "center";
  };
  menuTransformOrigin?: {
    vertical: "top" | "bottom" | "center";
    horizontal: "left" | "right" | "center";
  };
};

export function AccountMenu({
  anchorEl: externalAnchorEl,
  onAnchorClose,
  hideTrigger = false,
  menuAnchorOrigin = { vertical: "bottom", horizontal: "right" },
  menuTransformOrigin = { vertical: "top", horizontal: "right" },
}: AccountMenuProps = {}) {
  const theme = useTheme();
  const compactAccount = useMediaQuery(theme.breakpoints.down("md"));
  const { user, isCloudConfigured, canPersistLibrary, signOutUser, authStatus } = useCloudLibrary();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authHref = useMemo(() => {
    const search = searchParams.toString();
    return buildAuthPageHref(pathname, search ? `?${search}` : undefined);
  }, [pathname, searchParams]);
  const [internalAnchorEl, setInternalAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const isControlled = externalAnchorEl !== undefined;
  const anchorEl = isControlled ? externalAnchorEl : internalAnchorEl;
  const open = Boolean(anchorEl);

  function closeMenu() {
    if (onAnchorClose) onAnchorClose();
    else setInternalAnchorEl(null);
  }
  const signedInColor = user ? "success" : "inherit";
  const accountLabel = user ? emailLocalPart(user.email ?? undefined) : "";
  const accountTooltip = user?.email?.trim() ?? "Account";

  return (
    <>
      {!hideTrigger ? (
        <Tooltip title={accountTooltip}>
          <span>
            {user ? (
              compactAccount ? (
                <IconButton
                  aria-label="Account"
                  color={signedInColor}
                  onClick={(event) => setInternalAnchorEl(event.currentTarget)}
                >
                  <AccountCircleOutlinedIcon />
                </IconButton>
              ) : (
                <Button
                  aria-label="Account"
                  color="inherit"
                  onClick={(event) => setInternalAnchorEl(event.currentTarget)}
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
                onClick={(event) => setInternalAnchorEl(event.currentTarget)}
              >
                <AccountCircleOutlinedIcon />
              </IconButton>
            )}
          </span>
        </Tooltip>
      ) : null}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={menuAnchorOrigin}
        transformOrigin={menuTransformOrigin}
      >
        <MenuItem component={Link} href="/history" onClick={closeMenu}>
          <ListItemIcon>
            <HistoryOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>History</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/watch-later" onClick={closeMenu}>
          <ListItemIcon>
            <WatchLaterOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Watch Later</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href="/library/manage" onClick={closeMenu}>
          <ListItemIcon>
            <ViewColumnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Manage saved channels"
            secondary="Pins, searches, and removals"
          />
        </MenuItem>
        <Divider />
        <MenuItem component={Link} href="/settings" onClick={closeMenu}>
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Settings"
            secondary="Theme, watch page, and app preferences"
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
              onClick={closeMenu}
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
                closeMenu();
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
            onClick={closeMenu}
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
