import type { ThemeMode } from "@/lib/themePersistence";

/**
 * CleanTube brand palette — sea-glass teal + warm sand neutrals.
 * Intentionally unrelated to the legacy violet / magenta Daisy tokens.
 */
const brand = {
  light: {
    primary: "#0E7C73",
    primaryContrast: "#FFFFFF",
    secondary: "#B85C42",
    secondaryContrast: "#FFFFFF",
    background: "#F6F5F0",
    paper: "#EBE9E2",
    text: "#181917",
  },
  dark: {
    primary: "#5DD4CB",
    primaryContrast: "#141816",
    secondary: "#D49A7A",
    secondaryContrast: "#141816",
    background: "#141816",
    paper: "#1F2422",
    text: "#F2F1ED",
  },
} as const;

const semantic = {
  light: {
    info: { main: "#3B6B8C", contrastText: "#FFFFFF" },
    success: { main: "#2F8F62", contrastText: "#FFFFFF" },
    warning: { main: "#B8862E", contrastText: "#181917" },
    error: { main: "#C44050", contrastText: "#FFFFFF" },
  },
  dark: {
    info: { main: "#7EB8D4", contrastText: "#141816" },
    success: { main: "#6BC99A", contrastText: "#141816" },
    warning: { main: "#E5B84D", contrastText: "#141816" },
    error: { main: "#F08088", contrastText: "#141816" },
  },
} as const;

export const lightPalette = {
  mode: "light" as const,
  primary: { main: brand.light.primary, contrastText: brand.light.primaryContrast },
  secondary: {
    main: brand.light.secondary,
    contrastText: brand.light.secondaryContrast,
  },
  ...semantic.light,
  background: { default: brand.light.background, paper: brand.light.paper },
  text: {
    primary: brand.light.text,
    secondary: "rgba(24, 25, 23, 0.72)",
  },
  divider: "#1819171F",
  action: {
    hover: "#0E7C7314",
    selected: "#0E7C7329",
    disabled: "#18191761",
    disabledBackground: "#1819170F",
  },
  overlay: "#000000",
  scrim: "#000000",
};

export const darkPalette = {
  mode: "dark" as const,
  primary: { main: brand.dark.primary, contrastText: brand.dark.primaryContrast },
  secondary: {
    main: brand.dark.secondary,
    contrastText: brand.dark.secondaryContrast,
  },
  ...semantic.dark,
  background: { default: brand.dark.background, paper: brand.dark.paper },
  text: {
    primary: brand.dark.text,
    secondary: "rgba(242, 241, 237, 0.72)",
  },
  divider: "#F2F1ED1F",
  action: {
    hover: "#5DD4CB14",
    selected: "#5DD4CB29",
    disabled: "#F2F1ED61",
    disabledBackground: "#F2F1ED0F",
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
