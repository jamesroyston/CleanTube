export const THEME_MODE_STORAGE_KEY = "cleantube-theme";
export const THEME_MODE_COOKIE = "cleantube-theme";

/** Legacy keys — cleared on load when migrating off palette presets. */
export const LEGACY_THEME_DARK_PRESET_STORAGE_KEY = "cleantube-theme-dark-preset";
export const LEGACY_THEME_LIGHT_PRESET_STORAGE_KEY = "cleantube-theme-light-preset";
export const LEGACY_THEME_DARK_PRESET_COOKIE = "cleantube-theme-dark-preset";
export const LEGACY_THEME_LIGHT_PRESET_COOKIE = "cleantube-theme-light-preset";

export type ThemeMode = "light" | "dark";

export type InitialThemeSettings = {
  mode: ThemeMode;
  hasStoredCookie: boolean;
};

export function normalizeThemeMode(
  value: string | null | undefined,
): ThemeMode | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

export function createInitialThemeSettings(input: {
  mode?: string | null;
  hasStoredCookie?: boolean;
}): InitialThemeSettings {
  return {
    mode: normalizeThemeMode(input.mode) ?? "dark",
    hasStoredCookie: input.hasStoredCookie === true,
  };
}
