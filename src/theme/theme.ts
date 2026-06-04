import { alpha, createTheme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation";

import { BREAKPOINT_VALUES } from "@/theme/breakpoints";
import { darkColorScheme, lightColorScheme } from "@/theme/tokens";

type SsrMatchMedia = (query: string) => {
  matches: boolean;
  addEventListener?: () => void;
  removeEventListener?: () => void;
};

export type CreateAppThemeOptions = {
  /** SSR width/hint-aware matchMedia for `useMediaQuery` (MUI official pattern). */
  ssrMatchMedia?: SsrMatchMedia;
};

const fontFamily =
  'var(--font-plus-jakarta), "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

const typographyScale = {
  fontFamily,
  h1: { fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" },
  h2: { fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em" },
  h3: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.015em" },
  h4: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.01em" },
  h5: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.45 },
  subtitle1: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.5 },
  body1: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.55 },
  caption: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.5 },
  overline: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  button: {
    fontFamily,
    fontWeight: 600,
    fontSize: "0.875rem",
    lineHeight: 1.5,
    letterSpacing: "0.01em",
    textTransform: "none" as const,
  },
};

const cardShadowLight =
  "0 1px 2px rgba(26, 27, 30, 0.06), 0 4px 12px rgba(26, 27, 30, 0.04)";
const cardShadowDark =
  "0 1px 2px rgba(0, 0, 0, 0.24), 0 4px 12px rgba(0, 0, 0, 0.18)";

/**
 * Single MUI theme with CSS variables and light/dark color schemes.
 * Selector matches existing `html[data-theme="light|dark"]` SSR + PWA bootstrap.
 */
export function createAppTheme(options: CreateAppThemeOptions = {}) {
  const { ssrMatchMedia } = options;

  return createTheme({
    cssVariables: {
      colorSchemeSelector: '[data-theme="%s"]',
    },
    colorSchemes: {
      light: lightColorScheme,
      dark: darkColorScheme,
    },
    breakpoints: { values: BREAKPOINT_VALUES },
    shape: {
      borderRadius: 12,
    },
    typography: typographyScale,
    shadows: [
      "none",
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
      cardShadowLight,
    ],
    components: {
      ...(ssrMatchMedia
        ? {
            MuiUseMediaQuery: {
              defaultProps: { ssrMatchMedia },
            },
          }
        : {}),
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          body: {
            backgroundColor: theme.vars.palette.background.default,
            color: theme.vars.palette.text.primary,
            scrollBehavior: "smooth",
          },
        }),
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 9999,
            paddingInline: 20,
          },
        },
      },
      MuiTypography: {
        defaultProps: {
          color: "text.primary",
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 8,
            fontWeight: 500,
            ...theme.applyStyles("dark", {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            }),
          }),
          outlined: ({ theme }) => ({
            borderColor: theme.vars.palette.divider,
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            marginInline: 8,
            marginBlock: 2,
            ...theme.applyStyles("dark", {
              "&.Mui-selected": {
                backgroundColor: alpha(theme.palette.primary.main, 0.16),
              },
            }),
            ...theme.applyStyles("light", {
              "&.Mui-selected": {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            }),
          }),
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.vars.palette.background.paper,
            borderBottom: `1px solid ${theme.vars.palette.divider}`,
            color: theme.vars.palette.text.primary,
            backgroundImage: "none",
            boxShadow: "none",
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.vars.palette.background.default,
            color: theme.vars.palette.text.primary,
            borderRight: `1px solid ${theme.vars.palette.divider}`,
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: "none",
            ...theme.applyStyles("dark", { boxShadow: cardShadowDark }),
            ...theme.applyStyles("light", { boxShadow: cardShadowLight }),
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.vars.palette.background.paper,
            border: `1px solid ${theme.vars.palette.divider}`,
            backgroundImage: "none",
            borderRadius: 12,
            ...theme.applyStyles("dark", { boxShadow: cardShadowDark }),
            ...theme.applyStyles("light", { boxShadow: cardShadowLight }),
          }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.vars.palette.background.paper,
            border: `1px solid ${theme.vars.palette.divider}`,
            backgroundImage: "none",
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          notchedOutline: ({ theme }) => ({
            borderColor: alpha(theme.palette.text.primary, 0.2),
          }),
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: ({ theme }) => ({
            minWidth: 64,
            "&.Mui-selected": {
              color: theme.vars.palette.primary.main,
            },
          }),
          label: {
            fontSize: "0.6875rem",
            fontWeight: 600,
            "&.Mui-selected": {
              fontSize: "0.6875rem",
            },
          },
        },
      },
    },
  });
}

export { cardShadowDark, cardShadowLight };
