import {
  DEFAULT_DARK_PRESET,
  DEFAULT_LIGHT_PRESET,
  normalizeDarkPreset,
  normalizeLightPreset,
  type DarkPresetId,
  type LightPresetId,
} from "@/theme/presets";

export const THEME_MODE_STORAGE_KEY = "cleantube-theme";
export const THEME_DARK_PRESET_STORAGE_KEY = "cleantube-theme-dark-preset";
export const THEME_LIGHT_PRESET_STORAGE_KEY = "cleantube-theme-light-preset";

export const THEME_MODE_COOKIE = "cleantube-theme";
export const THEME_DARK_PRESET_COOKIE = "cleantube-theme-dark-preset";
export const THEME_LIGHT_PRESET_COOKIE = "cleantube-theme-light-preset";

export type ThemeMode = "light" | "dark";

export type InitialThemeSettings = {
  mode: ThemeMode;
  darkPresetId: DarkPresetId;
  lightPresetId: LightPresetId;
  hasStoredCookie: boolean;
};

export function normalizeThemeMode(value: string | null | undefined): ThemeMode | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

export function createInitialThemeSettings(input: {
  mode?: string | null;
  darkPresetId?: string | null;
  lightPresetId?: string | null;
  hasStoredCookie?: boolean;
}): InitialThemeSettings {
  return {
    mode: normalizeThemeMode(input.mode) ?? "dark",
    darkPresetId: normalizeDarkPreset(input.darkPresetId ?? DEFAULT_DARK_PRESET),
    lightPresetId: normalizeLightPreset(input.lightPresetId ?? DEFAULT_LIGHT_PRESET),
    hasStoredCookie: input.hasStoredCookie === true,
  };
}
