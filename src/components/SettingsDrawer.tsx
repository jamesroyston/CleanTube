"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { useThemeMode } from "@/app/providers";
import { ThemePresetPickerContent } from "@/components/ThemePresetPickerContent";

const DRAWER_WIDTH = 360;

export function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const { mode, toggleMode } = useThemeMode();

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="Open settings"
        size="medium"
        color="inherit"
      >
        <SettingsIcon />
      </IconButton>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: DRAWER_WIDTH },
            maxWidth: "100%",
          },
        }}
      >
        <Toolbar
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            gap: 1,
            minHeight: { xs: 56, sm: 64 },
          }}
        >
          <SettingsIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Settings
          </Typography>
        </Toolbar>
        <Box sx={{ px: 2, py: 2, overflow: "auto" }}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
            Appearance
          </Typography>
          <ListItemButton
            onClick={() => toggleMode()}
            sx={{ borderRadius: 1, mb: 1, border: 1, borderColor: "divider" }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText
              primary={
                mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              secondary={mode === "dark" ? "Currently dark" : "Currently light"}
            />
          </ListItemButton>

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
            Theme presets
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose your preferred dark and light palettes.
          </Typography>
          <ThemePresetPickerContent />
        </Box>
      </Drawer>
    </>
  );
}
