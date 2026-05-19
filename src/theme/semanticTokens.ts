/**
 * DaisyUI-style semantic color tokens (light / dark only).
 * Values are applied as CSS variables on `html[data-theme]` and mapped into MUI.
 */
export type SemanticThemeTokens = {
  colorScheme: "light" | "dark";
  base100: string;
  base200: string;
  base300: string;
  baseContent: string;
  primary: string;
  primaryContent: string;
  secondary: string;
  secondaryContent: string;
  accent: string;
  accentContent: string;
  neutral: string;
  neutralContent: string;
  info: string;
  infoContent: string;
  success: string;
  successContent: string;
  warning: string;
  warningContent: string;
  error: string;
  errorContent: string;
  radiusSelector: string;
  radiusField: string;
  radiusBox: string;
};

export const DARK_SEMANTIC_TOKENS: SemanticThemeTokens = {
  colorScheme: "dark",
  base100: "oklch(25.33% 0.016 252.42)",
  base200: "oklch(23.26% 0.014 253.1)",
  base300: "oklch(21.15% 0.012 254.09)",
  baseContent: "oklch(97.807% 0.029 256.847)",
  primary: "oklch(58% 0.233 277.117)",
  primaryContent: "oklch(96% 0.018 272.314)",
  secondary: "oklch(65% 0.241 354.308)",
  secondaryContent: "oklch(94% 0.028 342.258)",
  accent: "oklch(77% 0.152 181.912)",
  accentContent: "oklch(38% 0.063 188.416)",
  neutral: "oklch(14% 0.005 285.823)",
  neutralContent: "oklch(92% 0.004 286.32)",
  info: "oklch(74% 0.16 232.661)",
  infoContent: "oklch(29% 0.066 243.157)",
  success: "oklch(76% 0.177 163.223)",
  successContent: "oklch(37% 0.077 168.94)",
  warning: "oklch(82% 0.189 84.429)",
  warningContent: "oklch(41% 0.112 45.904)",
  error: "oklch(71% 0.194 13.428)",
  errorContent: "oklch(27% 0.105 12.094)",
  radiusSelector: "0.5rem",
  radiusField: "0.25rem",
  radiusBox: "0.5rem",
};

export const LIGHT_SEMANTIC_TOKENS: SemanticThemeTokens = {
  colorScheme: "light",
  base100: "oklch(100% 0 0)",
  base200: "oklch(98% 0 0)",
  base300: "oklch(95% 0 0)",
  baseContent: "oklch(21% 0.006 285.885)",
  primary: "oklch(45% 0.24 277.023)",
  primaryContent: "oklch(93% 0.034 272.788)",
  secondary: "oklch(65% 0.241 354.308)",
  secondaryContent: "oklch(94% 0.028 342.258)",
  accent: "oklch(77% 0.152 181.912)",
  accentContent: "oklch(38% 0.063 188.416)",
  neutral: "oklch(14% 0.005 285.823)",
  neutralContent: "oklch(92% 0.004 286.32)",
  info: "oklch(74% 0.16 232.661)",
  infoContent: "oklch(29% 0.066 243.157)",
  success: "oklch(76% 0.177 163.223)",
  successContent: "oklch(37% 0.077 168.94)",
  warning: "oklch(82% 0.189 84.429)",
  warningContent: "oklch(41% 0.112 45.904)",
  error: "oklch(71% 0.194 13.428)",
  errorContent: "oklch(27% 0.105 12.094)",
  radiusSelector: "0.5rem",
  radiusField: "0.25rem",
  radiusBox: "0.5rem",
};

export function semanticTokensForMode(mode: "light" | "dark"): SemanticThemeTokens {
  return mode === "dark" ? DARK_SEMANTIC_TOKENS : LIGHT_SEMANTIC_TOKENS;
}

/** Hex palette derived from oklch tokens — MUI only accepts #rgb, hsl(), etc. */
export type MuiHexPalette = {
  base100: string;
  base200: string;
  base300: string;
  baseContent: string;
  primary: string;
  primaryContent: string;
  secondary: string;
  secondaryContent: string;
  accent: string;
  accentContent: string;
  neutral: string;
  neutralContent: string;
  info: string;
  infoContent: string;
  success: string;
  successContent: string;
  warning: string;
  warningContent: string;
  error: string;
  errorContent: string;
};

/** Convert oklch(...) to #rrggbb for MUI createTheme (oklch → OKLab → sRGB). */
export function oklchToHex(oklch: string): string {
  const match = /^oklch\(([^)]+)\)$/i.exec(oklch.trim());
  if (!match) return oklch;

  const parts = match[1].split(/[\s,/]+/).filter(Boolean);
  let l = parseFloat(parts[0]);
  if (parts[0].endsWith("%")) l /= 100;
  const c = parseFloat(parts[1]);
  const h = (parseFloat(parts[2]) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const lc = l_ ** 3;
  const mc = m_ ** 3;
  const sc = s_ ** 3;

  let r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  const toSrgb = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(toSrgb(v) * 255)));
  const hex = (n: number) => clamp(n).toString(16).padStart(2, "0");

  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

export function muiHexPaletteForMode(mode: "light" | "dark"): MuiHexPalette {
  const t = semanticTokensForMode(mode);
  return {
    base100: oklchToHex(t.base100),
    base200: oklchToHex(t.base200),
    base300: oklchToHex(t.base300),
    baseContent: oklchToHex(t.baseContent),
    primary: oklchToHex(t.primary),
    primaryContent: oklchToHex(t.primaryContent),
    secondary: oklchToHex(t.secondary),
    secondaryContent: oklchToHex(t.secondaryContent),
    accent: oklchToHex(t.accent),
    accentContent: oklchToHex(t.accentContent),
    neutral: oklchToHex(t.neutral),
    neutralContent: oklchToHex(t.neutralContent),
    info: oklchToHex(t.info),
    infoContent: oklchToHex(t.infoContent),
    success: oklchToHex(t.success),
    successContent: oklchToHex(t.successContent),
    warning: oklchToHex(t.warning),
    warningContent: oklchToHex(t.warningContent),
    error: oklchToHex(t.error),
    errorContent: oklchToHex(t.errorContent),
  };
}

/** Apply semantic CSS variables to the document root (client). */
export function applySemanticCssVariables(
  root: HTMLElement,
  tokens: SemanticThemeTokens,
): void {
  root.style.colorScheme = tokens.colorScheme;
  root.dataset.theme = tokens.colorScheme;
  const vars: Record<string, string> = {
    "--color-base-100": tokens.base100,
    "--color-base-200": tokens.base200,
    "--color-base-300": tokens.base300,
    "--color-base-content": tokens.baseContent,
    "--color-primary": tokens.primary,
    "--color-primary-content": tokens.primaryContent,
    "--color-secondary": tokens.secondary,
    "--color-secondary-content": tokens.secondaryContent,
    "--color-accent": tokens.accent,
    "--color-accent-content": tokens.accentContent,
    "--color-neutral": tokens.neutral,
    "--color-neutral-content": tokens.neutralContent,
    "--color-info": tokens.info,
    "--color-info-content": tokens.infoContent,
    "--color-success": tokens.success,
    "--color-success-content": tokens.successContent,
    "--color-warning": tokens.warning,
    "--color-warning-content": tokens.warningContent,
    "--color-error": tokens.error,
    "--color-error-content": tokens.errorContent,
    "--radius-selector": tokens.radiusSelector,
    "--radius-field": tokens.radiusField,
    "--radius-box": tokens.radiusBox,
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
