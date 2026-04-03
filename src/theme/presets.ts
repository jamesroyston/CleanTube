/**
 * DaisyUI-adjacent naming; only used for palette tokens (not Daisy itself).
 */
export type DarkPresetId =
  | "cursor"
  | "night"
  | "dracula"
  | "synthwave"
  | "dim"
  | "coffee"
  | "forest";

export type LightPresetId = "clean" | "paper" | "mint" | "sand";

export type PaletteTokens = {
  primary: string;
  secondary: string;
  background: string;
  paper: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  appBar: string;
  hover: string;
  selected: string;
};

export const DEFAULT_DARK_PRESET: DarkPresetId = "cursor";
export const DEFAULT_LIGHT_PRESET: LightPresetId = "clean";

export const DARK_PRESETS: Record<DarkPresetId, PaletteTokens> = {
  cursor: {
    primary: "#7eb6ff",
    secondary: "#9cdcfe",
    background: "#1a1d23",
    paper: "#23262e",
    divider: "rgba(180, 198, 220, 0.12)",
    textPrimary: "#d8dee9",
    textSecondary: "#9aa4b2",
    appBar: "#1e2128",
    hover: "rgba(126, 182, 255, 0.08)",
    selected: "rgba(126, 182, 255, 0.16)",
  },
  night: {
    primary: "#818cf8",
    secondary: "#38bdf8",
    background: "#0f172a",
    paper: "#1e293b",
    divider: "rgba(148, 163, 184, 0.14)",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    appBar: "#1e293b",
    hover: "rgba(129, 140, 248, 0.1)",
    selected: "rgba(129, 140, 248, 0.18)",
  },
  dracula: {
    primary: "#ff79c6",
    secondary: "#8be9fd",
    background: "#282a36",
    paper: "#343746",
    divider: "rgba(248, 248, 242, 0.1)",
    textPrimary: "#f8f8f2",
    textSecondary: "#bd93f9",
    appBar: "#21222c",
    hover: "rgba(255, 121, 198, 0.08)",
    selected: "rgba(255, 121, 198, 0.15)",
  },
  synthwave: {
    primary: "#ff7edb",
    secondary: "#36f2f5",
    background: "#1a1423",
    paper: "#2b213f",
    divider: "rgba(255, 126, 219, 0.15)",
    textPrimary: "#fdeff9",
    textSecondary: "#b8a9c9",
    appBar: "#241731",
    hover: "rgba(255, 126, 219, 0.1)",
    selected: "rgba(54, 242, 245, 0.12)",
  },
  dim: {
    primary: "#fbbf24",
    secondary: "#f59e0b",
    background: "#1f2937",
    paper: "#374151",
    divider: "rgba(251, 191, 36, 0.12)",
    textPrimary: "#f9fafb",
    textSecondary: "#9ca3af",
    appBar: "#111827",
    hover: "rgba(251, 191, 36, 0.08)",
    selected: "rgba(251, 191, 36, 0.15)",
  },
  coffee: {
    primary: "#fdba74",
    secondary: "#fb923c",
    background: "#1c1917",
    paper: "#292524",
    divider: "rgba(253, 186, 116, 0.12)",
    textPrimary: "#fafaf9",
    textSecondary: "#a8a29e",
    appBar: "#0c0a09",
    hover: "rgba(253, 186, 116, 0.08)",
    selected: "rgba(253, 186, 116, 0.14)",
  },
  forest: {
    primary: "#a3e635",
    secondary: "#4ade80",
    background: "#14532d",
    paper: "#166534",
    divider: "rgba(163, 230, 53, 0.15)",
    textPrimary: "#f7fee7",
    textSecondary: "#bef264",
    appBar: "#052e16",
    hover: "rgba(163, 230, 53, 0.1)",
    selected: "rgba(74, 222, 128, 0.15)",
  },
};

export const LIGHT_PRESETS: Record<LightPresetId, PaletteTokens> = {
  clean: {
    primary: "#2563eb",
    secondary: "#0284c7",
    background: "#f5f6f8",
    paper: "#ffffff",
    divider: "rgba(15, 23, 42, 0.08)",
    textPrimary: "#1a1d23",
    textSecondary: "#5c6570",
    appBar: "#ffffff",
    hover: "rgba(37, 99, 235, 0.06)",
    selected: "rgba(37, 99, 235, 0.12)",
  },
  paper: {
    primary: "#d97706",
    secondary: "#ea580c",
    background: "#fffbeb",
    paper: "#fff7ed",
    divider: "rgba(120, 53, 15, 0.1)",
    textPrimary: "#292524",
    textSecondary: "#78716c",
    appBar: "#fff7ed",
    hover: "rgba(217, 119, 6, 0.08)",
    selected: "rgba(217, 119, 6, 0.14)",
  },
  mint: {
    primary: "#0d9488",
    secondary: "#059669",
    background: "#f0fdfa",
    paper: "#ccfbf1",
    divider: "rgba(15, 118, 110, 0.12)",
    textPrimary: "#134e4a",
    textSecondary: "#0f766e",
    appBar: "#ecfdf5",
    hover: "rgba(13, 148, 136, 0.08)",
    selected: "rgba(13, 148, 136, 0.14)",
  },
  sand: {
    primary: "#78716c",
    secondary: "#a8a29e",
    background: "#faf8f5",
    paper: "#ffffff",
    divider: "rgba(68, 64, 60, 0.1)",
    textPrimary: "#292524",
    textSecondary: "#78716c",
    appBar: "#f5f5f4",
    hover: "rgba(120, 113, 108, 0.08)",
    selected: "rgba(120, 113, 108, 0.12)",
  },
};

export const DARK_LIST: { id: DarkPresetId; label: string }[] = [
  { id: "cursor", label: "Cursor" },
  { id: "night", label: "Night" },
  { id: "dracula", label: "Dracula" },
  { id: "synthwave", label: "Synthwave" },
  { id: "dim", label: "Dim" },
  { id: "coffee", label: "Coffee" },
  { id: "forest", label: "Forest" },
];

export const LIGHT_LIST: { id: LightPresetId; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "paper", label: "Paper" },
  { id: "mint", label: "Mint" },
  { id: "sand", label: "Sand" },
];

export function normalizeDarkPreset(id: string | null): DarkPresetId {
  if (id && id in DARK_PRESETS) return id as DarkPresetId;
  return DEFAULT_DARK_PRESET;
}

export function normalizeLightPreset(id: string | null): LightPresetId {
  if (id && id in LIGHT_PRESETS) return id as LightPresetId;
  return DEFAULT_LIGHT_PRESET;
}
