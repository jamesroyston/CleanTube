"use client";

import ClearAllOutlinedIcon from "@mui/icons-material/ClearAllOutlined";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";

import { LogoConceptsPreview } from "@/components/LogoConceptsPreview";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import {
  useThemeMode,
  useWatchCommentsVisible,
  useWatchNarrowPlayerLayout,
  useWatchUpNextVisible,
} from "@/app/providers";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import {
  compactMainPaddingBottom,
  useShowBottomNav,
} from "@/hooks/useCompactViewport";
import { clearChannelPageSessionBackups } from "@/lib/channelPageClientCache";

export function SettingsPageClient() {
  const showBottomNav = useShowBottomNav();
  const router = useRouter();
  const { mode, toggleMode } = useThemeMode();
  const { visible: commentsVisible, setWatchCommentsVisible } =
    useWatchCommentsVisible();
  const { visible: upNextVisible, setWatchUpNextVisible } =
    useWatchUpNextVisible();
  const { enabled: narrowPlayerLayout, setWatchNarrowPlayerLayout } =
    useWatchNarrowPlayerLayout();
  const { canPersistLibrary } = useCloudLibrary();

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        pb: compactMainPaddingBottom(showBottomNav, 24) ?? 3,
      }}
    >
      <MobilePageHeader title="Settings" backHref="/account" backLabel="Back to account" />

      <List component={Paper} variant="outlined" disablePadding sx={{ mb: 3 }}>
        <ListSubheader disableSticky>Appearance</ListSubheader>
        <ListItemButton onClick={toggleMode}>
          <ListItemIcon>
            {mode === "dark" ? (
              <LightModeIcon />
            ) : (
              <DarkModeIcon />
            )}
          </ListItemIcon>
          <ListItemText
            primary={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
        </ListItemButton>
      </List>

      <Paper variant="outlined" sx={{ mb: 3, overflow: "hidden" }}>
        <ListSubheader disableSticky sx={{ bgcolor: "transparent" }}>
          Watch page
        </ListSubheader>
        <List disablePadding>
          <ListItem sx={{ px: 2, py: 1.5, alignItems: "flex-start" }}>
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
          </ListItem>
          <Divider component="li" />
          <ListItem sx={{ px: 2, py: 1.5, alignItems: "flex-start" }}>
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
          </ListItem>
          <Divider component="li" />
          <ListItem sx={{ px: 2, py: 1.5, alignItems: "flex-start" }}>
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
          </ListItem>
        </List>
      </Paper>

      <LogoConceptsPreview />

      <List component={Paper} variant="outlined" disablePadding sx={{ mb: 3 }}>
        <ListSubheader disableSticky>Maintenance</ListSubheader>
        <ListItemButton
          onClick={() => {
            clearChannelPageSessionBackups();
            router.refresh();
          }}
        >
          <ListItemIcon>
            <ClearAllOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Clear channel page backups"
            secondary="Clears session-only channel grid cache if the grid looks stuck."
            secondaryTypographyProps={{
              sx: { whiteSpace: "normal", wordBreak: "break-word" },
            }}
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
    </Box>
  );
}
