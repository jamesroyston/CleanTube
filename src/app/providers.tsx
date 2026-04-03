"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { createAppTheme } from "@/theme/theme";
import {
  DEFAULT_DARK_PRESET,
  DEFAULT_LIGHT_PRESET,
  normalizeDarkPreset,
  normalizeLightPreset,
  type DarkPresetId,
  type LightPresetId,
} from "@/theme/presets";

const STORAGE_MODE = "cleantube-theme";
const STORAGE_DARK_PRESET = "cleantube-theme-dark-preset";
const STORAGE_LIGHT_PRESET = "cleantube-theme-light-preset";

type Mode = "light" | "dark";

type ThemeContextValue = {
  mode: Mode;
  toggleMode: () => void;
  setMode: (m: Mode) => void;
  darkPresetId: DarkPresetId;
  lightPresetId: LightPresetId;
  setDarkPresetId: (id: DarkPresetId) => void;
  setLightPresetId: (id: LightPresetId) => void;
};

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

function readInitialMode(): Mode {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_MODE) as Mode | null;
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

function readInitialDarkPreset(): DarkPresetId {
  if (typeof window === "undefined") return DEFAULT_DARK_PRESET;
  try {
    return normalizeDarkPreset(localStorage.getItem(STORAGE_DARK_PRESET));
  } catch {
    return DEFAULT_DARK_PRESET;
  }
}

function readInitialLightPreset(): LightPresetId {
  if (typeof window === "undefined") return DEFAULT_LIGHT_PRESET;
  try {
    return normalizeLightPreset(localStorage.getItem(STORAGE_LIGHT_PRESET));
  } catch {
    return DEFAULT_LIGHT_PRESET;
  }
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within AppProviders");
  return ctx;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("dark");
  const [darkPresetId, setDarkPresetIdState] =
    useState<DarkPresetId>(DEFAULT_DARK_PRESET);
  const [lightPresetId, setLightPresetIdState] =
    useState<LightPresetId>(DEFAULT_LIGHT_PRESET);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
    setModeState(readInitialMode());
    setDarkPresetIdState(readInitialDarkPreset());
    setLightPresetIdState(readInitialLightPreset());
  }, []);

  useLayoutEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!e.newValue) return;
      if (e.key === STORAGE_MODE) {
        if (e.newValue === "light" || e.newValue === "dark") {
          setModeState(e.newValue);
        }
      }
      if (e.key === STORAGE_DARK_PRESET) {
        setDarkPresetIdState(normalizeDarkPreset(e.newValue));
      }
      if (e.key === STORAGE_LIGHT_PRESET) {
        setLightPresetIdState(normalizeLightPreset(e.newValue));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_MODE, m);
    } catch {
      /* ignore */
    }
  }, []);

  const setDarkPresetId = useCallback((id: DarkPresetId) => {
    setDarkPresetIdState(id);
    try {
      localStorage.setItem(STORAGE_DARK_PRESET, id);
    } catch {
      /* ignore */
    }
  }, []);

  const setLightPresetId = useCallback((id: LightPresetId) => {
    setLightPresetIdState(id);
    try {
      localStorage.setItem(STORAGE_LIGHT_PRESET, id);
    } catch {
      /* ignore */
    }
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
          {children}
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
