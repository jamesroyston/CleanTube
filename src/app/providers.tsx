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
import {
  FOCUS_MODE_COOKIE,
  FOCUS_MODE_STORAGE_KEY,
} from "@/lib/focusModePersistence";

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

type TheatreFocusContextValue = {
  /** When true, the watch page hides the "Up next" column (Theatre focus). */
  enabled: boolean;
  setTheatreFocus: (value: boolean) => void;
  toggleTheatreFocus: () => void;
};

const TheatreFocusContext = createContext<TheatreFocusContextValue | null>(
  null,
);

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

function writeFocusCookie(value: "0" | "1"): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${FOCUS_MODE_COOKIE}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within AppProviders");
  return ctx;
}

export function useTheatreFocus() {
  const ctx = useContext(TheatreFocusContext);
  if (!ctx) {
    throw new Error("useTheatreFocus must be used within AppProviders");
  }
  return ctx;
}

export function AppProviders({
  children,
  initialTheme,
  initialTheatreFocus,
  hasFocusCookie,
}: {
  children: React.ReactNode;
  initialTheme: InitialThemeSettings;
  initialTheatreFocus: boolean;
  hasFocusCookie: boolean;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialTheme.mode);
  const [darkPresetId, setDarkPresetIdState] =
    useState<DarkPresetId>(initialTheme.darkPresetId);
  const [lightPresetId, setLightPresetIdState] =
    useState<LightPresetId>(initialTheme.lightPresetId);
  const [theatreFocus, setTheatreFocusState] = useState(initialTheatreFocus);

  useEffect(() => {
    if (hasFocusCookie) return;
    try {
      const raw = localStorage.getItem(FOCUS_MODE_STORAGE_KEY);
      if (raw === "1" || raw === "true" || raw === "on") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time migration from localStorage-only focus setting
        setTheatreFocusState(true);
        writeFocusCookie("1");
      }
    } catch {
      /* ignore */
    }
  }, [hasFocusCookie]);

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
      if (e.key === FOCUS_MODE_STORAGE_KEY) {
        const on =
          e.newValue === "1" ||
          e.newValue === "true" ||
          e.newValue === "on";
        setTheatreFocusState(on);
        writeFocusCookie(on ? "1" : "0");
        return;
      }
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

  const setTheatreFocus = useCallback((value: boolean) => {
    setTheatreFocusState(value);
    const encoded = value ? "1" : "0";
    try {
      localStorage.setItem(FOCUS_MODE_STORAGE_KEY, encoded);
    } catch {
      /* ignore */
    }
    writeFocusCookie(value ? "1" : "0");
  }, []);

  const toggleTheatreFocus = useCallback(() => {
    setTheatreFocus(!theatreFocus);
  }, [setTheatreFocus, theatreFocus]);

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

  const theatreValue = useMemo(
    () => ({
      enabled: theatreFocus,
      setTheatreFocus,
      toggleTheatreFocus,
    }),
    [theatreFocus, setTheatreFocus, toggleTheatreFocus],
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeModeContext.Provider value={value}>
        <TheatreFocusContext.Provider value={theatreValue}>
          <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <NavigationProgressProvider>{children}</NavigationProgressProvider>
          </ThemeProvider>
        </TheatreFocusContext.Provider>
      </ThemeModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
