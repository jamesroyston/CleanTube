"use client";

import CloseIcon from "@mui/icons-material/Close";
import PaletteIcon from "@mui/icons-material/Palette";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { useThemeMode } from "@/app/providers";
import {
  DARK_LIST,
  DARK_PRESETS,
  LIGHT_LIST,
  LIGHT_PRESETS,
  type DarkPresetId,
  type LightPresetId,
} from "@/theme/presets";

function PresetSwatch({ id, active }: { id: DarkPresetId | LightPresetId; active: boolean }) {
  const isDark = id in DARK_PRESETS;
  const t = isDark
    ? DARK_PRESETS[id as DarkPresetId]
    : LIGHT_PRESETS[id as LightPresetId];

  return (
    <Box
      sx={{
        width: "100%",
        height: 44,
        borderRadius: 1,
        border: "2px solid",
        borderColor: active ? "primary.main" : "divider",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        boxShadow: active ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33` : undefined,
      }}
    >
      <Box sx={{ bgcolor: t.background }} />
      <Box sx={{ bgcolor: t.paper }} />
      <Box sx={{ bgcolor: t.primary }} />
    </Box>
  );
}

export function ThemePresetPanel() {
  const [open, setOpen] = useState(false);
  const {
    mode,
    darkPresetId,
    lightPresetId,
    setDarkPresetId,
    setLightPresetId,
  } = useThemeMode();

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="Theme presets"
        size="medium"
      >
        <PaletteIcon />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 6 }}>
          Choose your dark (and light)
          <IconButton
            aria-label="Close"
            onClick={() => setOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Dark themes
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 1.5,
              mb: 3,
            }}
          >
            {DARK_LIST.map(({ id, label }) => (
              <Button
                key={id}
                onClick={() => setDarkPresetId(id)}
                variant="outlined"
                color={darkPresetId === id ? "primary" : "inherit"}
                sx={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  py: 1,
                  textTransform: "none",
                  borderWidth: darkPresetId === id ? 2 : 1,
                }}
              >
                <PresetSwatch id={id} active={darkPresetId === id} />
                <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600 }}>
                  {label}
                </Typography>
                {mode === "dark" && darkPresetId === id ? (
                  <Typography variant="caption" color="primary">
                    Active
                  </Typography>
                ) : null}
              </Button>
            ))}
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Light themes
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 1.5,
            }}
          >
            {LIGHT_LIST.map(({ id, label }) => (
              <Button
                key={id}
                onClick={() => setLightPresetId(id)}
                variant="outlined"
                color={lightPresetId === id ? "primary" : "inherit"}
                sx={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  py: 1,
                  textTransform: "none",
                  borderWidth: lightPresetId === id ? 2 : 1,
                }}
              >
                <PresetSwatch id={id} active={lightPresetId === id} />
                <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600 }}>
                  {label}
                </Typography>
                {mode === "light" && lightPresetId === id ? (
                  <Typography variant="caption" color="primary">
                    Active
                  </Typography>
                ) : null}
              </Button>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
