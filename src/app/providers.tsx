"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createAppTheme } from "@/theme/theme";
import {
  normalizeDarkPreset,
  normalizeLightPreset,
  type DarkPresetId,
  type LightPresetId,
} from "@/theme/presets";
import { NavigationProgressProvider } from "@/context/NavigationProgressContext";
import {
  type InitialThemeSettings,
  type ThemeMode,
  THEME_DARK_PRESET_COOKIE,
  THEME_DARK_PRESET_STORAGE_KEY,
  THEME_LIGHT_PRESET_COOKIE,
  THEME_LIGHT_PRESET_STORAGE_KEY,
  THEME_MODE_COOKIE,
  THEME_MODE_STORAGE_KEY,
  createInitialThemeSettings,
  normalizeThemeMode,
} from "@/lib/themePersistence";

type ThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (m: ThemeMode) => void;
  darkPresetId: DarkPresetId;
  lightPresetId: LightPresetId;
  setDarkPresetId: (id: DarkPresetId) => void;
  setLightPresetId: (id: LightPresetId) => void;
};

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

function readStoredThemeSettings(): InitialThemeSettings {
  if (typeof window === "undefined") {
    return createInitialThemeSettings({});
  }
  try {
    const storedMode = normalizeThemeMode(
      localStorage.getItem(THEME_MODE_STORAGE_KEY),
    );
    return createInitialThemeSettings({
      mode:
        storedMode ??
        (window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"),
      darkPresetId: localStorage.getItem(THEME_DARK_PRESET_STORAGE_KEY),
      lightPresetId: localStorage.getItem(THEME_LIGHT_PRESET_STORAGE_KEY),
    });
  } catch {
    return createInitialThemeSettings({});
  }
}

function writeThemeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(
      value,
    )}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function writeThemeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within AppProviders");
  return ctx;
}

export function AppProviders({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: InitialThemeSettings;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialTheme.mode);
  const [darkPresetId, setDarkPresetIdState] =
    useState<DarkPresetId>(initialTheme.darkPresetId);
  const [lightPresetId, setLightPresetIdState] =
    useState<LightPresetId>(initialTheme.lightPresetId);

  useEffect(() => {
    if (initialTheme.hasStoredCookie) return;
    const stored = readStoredThemeSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time migration from legacy localStorage-only theme settings
    setModeState(stored.mode);
    setDarkPresetIdState(stored.darkPresetId);
    setLightPresetIdState(stored.lightPresetId);
    writeThemeCookie(THEME_MODE_COOKIE, stored.mode);
    writeThemeCookie(THEME_DARK_PRESET_COOKIE, stored.darkPresetId);
    writeThemeCookie(THEME_LIGHT_PRESET_COOKIE, stored.lightPresetId);
  }, [initialTheme.hasStoredCookie]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!e.newValue) return;
      if (e.key === THEME_MODE_STORAGE_KEY) {
        const next = normalizeThemeMode(e.newValue);
        if (next) {
          setModeState(next);
          writeThemeCookie(THEME_MODE_COOKIE, next);
        }
      }
      if (e.key === THEME_DARK_PRESET_STORAGE_KEY) {
        const next = normalizeDarkPreset(e.newValue);
        setDarkPresetIdState(next);
        writeThemeCookie(THEME_DARK_PRESET_COOKIE, next);
      }
      if (e.key === THEME_LIGHT_PRESET_STORAGE_KEY) {
        const next = normalizeLightPreset(e.newValue);
        setLightPresetIdState(next);
        writeThemeCookie(THEME_LIGHT_PRESET_COOKIE, next);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    writeThemeStorage(THEME_MODE_STORAGE_KEY, m);
    writeThemeCookie(THEME_MODE_COOKIE, m);
  }, []);

  const setDarkPresetId = useCallback((id: DarkPresetId) => {
    setDarkPresetIdState(id);
    writeThemeStorage(THEME_DARK_PRESET_STORAGE_KEY, id);
    writeThemeCookie(THEME_DARK_PRESET_COOKIE, id);
  }, []);

  const setLightPresetId = useCallback((id: LightPresetId) => {
    setLightPresetIdState(id);
    writeThemeStorage(THEME_LIGHT_PRESET_STORAGE_KEY, id);
    writeThemeCookie(THEME_LIGHT_PRESET_COOKIE, id);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const theme = useMemo(
    () => createAppTheme(mode, darkPresetId, lightPresetId),
    [mode, darkPresetId, lightPresetId],
  );

  const value = useMemo(
    () => ({
      mode,
      toggleMode,
      setMode,
      darkPresetId,
      lightPresetId,
      setDarkPresetId,
      setLightPresetId,
    }),
    [
      mode,
      toggleMode,
      setMode,
      darkPresetId,
      lightPresetId,
      setDarkPresetId,
      setLightPresetId,
    ],
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeModeContext.Provider value={value}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          <NavigationProgressProvider>{children}</NavigationProgressProvider>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
