"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import FingerprintOutlinedIcon from "@mui/icons-material/FingerprintOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { PwaInstallButton } from "@/components/PwaInstallButton";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import {
  compactMainPaddingBottom,
  useShowBottomNav,
} from "@/hooks/useCompactViewport";
import { buildAuthPageHref } from "@/lib/authReturnNavigation";

function emailLocalPart(email: string | undefined): string {
  if (!email?.trim()) return "";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email.trim();
}

export function AccountPageClient() {
  const showBottomNav = useShowBottomNav();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isCloudConfigured, canPersistLibrary, signOutUser, authStatus } =
    useCloudLibrary();

  const authHref = useMemo(() => {
    const search = searchParams.toString();
    return buildAuthPageHref(pathname, search ? `?${search}` : undefined);
  }, [pathname, searchParams]);

  const displayName = user
    ? emailLocalPart(user.email ?? undefined) || "Account"
    : "Guest";

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        pb: compactMainPaddingBottom(showBottomNav, 24) ?? 3,
      }}
    >
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 3 }}>
        Account
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: user ? "success.main" : "action.selected",
            }}
          >
            <AccountCircleOutlinedIcon fontSize="large" />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" noWrap>
              {displayName}
            </Typography>
            {user?.email ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sign in to sync your library across devices
              </Typography>
            )}
            <Box sx={{ mt: 1 }}>
              {!isCloudConfigured ? (
                <Chip
                  size="small"
                  icon={<CloudOffOutlinedIcon />}
                  label="Cloud sync unavailable"
                  variant="outlined"
                />
              ) : user ? (
                <Chip
                  size="small"
                  color="success"
                  icon={<CloudDoneOutlinedIcon />}
                  label="Library sync enabled"
                  variant="outlined"
                />
              ) : (
                <Chip size="small" label="Local session only" variant="outlined" />
              )}
            </Box>
          </Box>
        </Stack>
      </Paper>

      <List component={Paper} variant="outlined" disablePadding sx={{ mb: 3 }}>
        {user ? (
          <>
            <ListItemButton component={Link} href={authHref}>
              <ListItemIcon>
                <FingerprintOutlinedIcon />
              </ListItemIcon>
              <ListItemText
                primary="Passkeys & account"
                secondary="Sign-in options and device passkeys"
              />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton
              onClick={() => {
                void signOutUser();
              }}
            >
              <ListItemIcon>
                <LogoutOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Sign out" />
            </ListItemButton>
          </>
        ) : (
          <ListItemButton
            component={Link}
            href={authHref}
            disabled={authStatus === "loading"}
          >
            <ListItemIcon>
              <LoginOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="Sign in or create account"
              secondary="Save your library across devices"
            />
          </ListItemButton>
        )}
        <Divider component="li" />
        <ListItemButton component={Link} href="/settings">
          <ListItemIcon>
            <SettingsOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Settings"
            secondary="Theme, watch page, and app preferences"
          />
        </ListItemButton>
        <Divider component="li" />
        <PwaInstallButton />
      </List>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {canPersistLibrary
          ? "Your library is saved to your account and syncs across devices."
          : "History, Watch Later, saved channels, and pinned searches require signing in."}
      </Typography>

      {!user ? (
        <Button
          component={Link}
          href={authHref}
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          disabled={authStatus === "loading"}
        >
          Sign in
        </Button>
      ) : null}
    </Box>
  );
}
