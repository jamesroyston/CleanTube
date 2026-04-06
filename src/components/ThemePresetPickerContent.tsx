"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { useThemeMode } from "@/app/providers";
import {
  DARK_LIST,
  DARK_PRESETS,
  LIGHT_LIST,
  LIGHT_PRESETS,
  type DarkPresetId,
  type LightPresetId,
} from "@/theme/presets";

function PresetSwatch({
  id,
  active,
}: {
  id: DarkPresetId | LightPresetId;
  active: boolean;
}) {
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
        boxShadow: active
          ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33`
          : undefined,
      }}
    >
      <Box sx={{ bgcolor: t.background }} />
      <Box sx={{ bgcolor: t.paper }} />
      <Box sx={{ bgcolor: t.primary }} />
    </Box>
  );
}

/** Shared preset grid for settings dialog / drawer. */
export function ThemePresetPickerContent() {
  const {
    mode,
    darkPresetId,
    lightPresetId,
    setDarkPresetId,
    setLightPresetId,
  } = useThemeMode();

  return (
    <Box sx={{ pb: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Dark themes
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
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
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
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
    </Box>
  );
}
