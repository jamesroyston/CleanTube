import { alpha, createTheme } from "@mui/material/styles";

import { muiHexPaletteForMode } from "@/theme/semanticTokens";

type SsrMatchMedia = (query: string) => {
  matches: boolean;
  addEventListener?: () => void;
  removeEventListener?: () => void;
};

export type CreateAppThemeOptions = {
  /** SSR width/hint-aware matchMedia for `useMediaQuery` (MUI official pattern). */
  ssrMatchMedia?: SsrMatchMedia;
};

/**
 * MUI theme from DaisyUI-style semantic tokens.
 * CSS uses oklch via globals.css; MUI palette uses hex (MUI cannot parse oklch/var).
 */
export function createAppTheme(
  mode: "light" | "dark",
  options: CreateAppThemeOptions = {},
) {
  const c = muiHexPaletteForMode(mode);
  const { ssrMatchMedia } = options;

  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.primaryContent },
      secondary: { main: c.secondary, contrastText: c.secondaryContent },
      error: { main: c.error, contrastText: c.errorContent },
      warning: { main: c.warning, contrastText: c.warningContent },
      info: { main: c.info, contrastText: c.infoContent },
      success: { main: c.success, contrastText: c.successContent },
      background: { default: c.base100, paper: c.base200 },
      text: {
        primary: c.baseContent,
        secondary: alpha(c.baseContent, 0.72),
      },
      divider: alpha(c.baseContent, 0.12),
      action: {
        hover: alpha(c.primary, 0.08),
        selected: alpha(c.primary, 0.16),
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily:
        'var(--font-roboto), "Roboto", "Helvetica Neue", Arial, sans-serif',
    },
    components: {
      ...(ssrMatchMedia
        ? {
            MuiUseMediaQuery: {
              defaultProps: { ssrMatchMedia },
            },
          }
        : {}),
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "var(--color-base-100)",
            color: "var(--color-base-content)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: "var(--color-base-200)",
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: "var(--color-base-content)",
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "var(--color-base-100)",
            color: "var(--color-base-content)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: "var(--color-base-200)",
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: "none",
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-field)",
          },
          notchedOutline: ({ theme }) => ({
            borderColor: alpha(theme.palette.text.primary, 0.2),
          }),
        },
      },
    },
  });
}
