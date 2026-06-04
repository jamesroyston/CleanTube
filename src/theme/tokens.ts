import type { ThemeMode } from "@/lib/themePersistence";

/** Shared semantic colors for light and dark color schemes. */
const semantic = {
  info: { main: "#4A90A4", contrastText: "#FFFFFF" },
  success: { main: "#3D9B6E", contrastText: "#FFFFFF" },
  warning: { main: "#C4923A", contrastText: "#1A1B1E" },
  error: { main: "#D64550", contrastText: "#FFFFFF" },
} as const;

export const lightPalette = {
  mode: "light" as const,
  primary: { main: "#5B58D6", contrastText: "#FFFFFF" },
  secondary: { main: "#6E7B72", contrastText: "#FFFFFF" },
  ...semantic,
  background: { default: "#FAFAF8", paper: "#F0F0EC" },
  text: { primary: "#1A1B1E", secondary: "rgba(26, 27, 30, 0.72)" },
  divider: "#1A1B1E1F",
  action: {
    hover: "#5B58D614",
    selected: "#5B58D629",
    disabled: "#1A1B1E61",
    disabledBackground: "#1A1B1E0F",
  },
  overlay: "#000000",
  scrim: "#000000",
};

export const darkPalette = {
  mode: "dark" as const,
  primary: { main: "#8A88F0", contrastText: "#1A1B1E" },
  secondary: { main: "#8A958C", contrastText: "#1A1B1E" },
  info: { main: "#6BAEC4", contrastText: "#1A1B1E" },
  success: { main: "#5CB888", contrastText: "#1A1B1E" },
  warning: { main: "#D4A84A", contrastText: "#1A1B1E" },
  error: { main: "#E86872", contrastText: "#1A1B1E" },
  background: { default: "#1A1B1E", paper: "#24262B" },
  text: { primary: "#F4F4F1", secondary: "rgba(244, 244, 241, 0.72)" },
  divider: "#F4F4F11F",
  action: {
    hover: "#8A88F014",
    selected: "#8A88F029",
    disabled: "#F4F4F161",
    disabledBackground: "#F4F4F10F",
  },
  overlay: "#000000",
  scrim: "#000000",
};

export const lightColorScheme = { palette: lightPalette };
export const darkColorScheme = { palette: darkPalette };

export function getThemeMetaColors(mode: ThemeMode): {
  backgroundColor: string;
  themeColor: string;
} {
  const palette = mode === "dark" ? darkPalette : lightPalette;
  return {
    backgroundColor: palette.background.default,
    themeColor: palette.primary.main,
  };
}
