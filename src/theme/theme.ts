import { createTheme } from "@mui/material/styles";

import {
  DARK_PRESETS,
  DEFAULT_DARK_PRESET,
  DEFAULT_LIGHT_PRESET,
  LIGHT_PRESETS,
  type DarkPresetId,
  type LightPresetId,
} from "@/theme/presets";

export function createAppTheme(
  mode: "light" | "dark",
  darkPresetId: DarkPresetId = DEFAULT_DARK_PRESET,
  lightPresetId: LightPresetId = DEFAULT_LIGHT_PRESET,
) {
  const tokens =
    mode === "dark"
      ? DARK_PRESETS[darkPresetId]
      : LIGHT_PRESETS[lightPresetId];

  return createTheme({
    palette: {
      mode,
      primary: { main: tokens.primary },
      secondary: { main: tokens.secondary },
      background: {
        default: tokens.background,
        paper: tokens.paper,
      },
      divider: tokens.divider,
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
      },
      action: {
        hover: tokens.hover,
        selected: tokens.selected,
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily:
        'var(--font-roboto), "Roboto", "Helvetica Neue", Arial, sans-serif',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: tokens.appBar,
            borderBottom: `1px solid ${tokens.divider}`,
            color: tokens.textPrimary,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${tokens.divider}`,
            backgroundImage: "none",
          },
        },
      },
    },
  });
}
