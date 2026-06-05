"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setLibrarySidebarCollapsedAction } from "@/app/actions/librarySidebarCollapsed";
import { setWatchCommentsVisibleAction } from "@/app/actions/watchCommentsVisibility";
import { setWatchNarrowPlayerLayoutAction } from "@/app/actions/watchNarrowPlayerLayout";
import { setWatchUpNextVisibleAction } from "@/app/actions/watchUpNextVisibility";
import { NavigationProgressProvider } from "@/context/NavigationProgressContext";
import { BrowseLayoutProvider } from "@/context/BrowseLayoutContext";
import { CompactLayoutProvider } from "@/context/CompactLayoutContext";
import type { CompactLayoutHint } from "@/lib/compactLayoutHint";
import { SWRConfig } from "swr";

import { hydrateChannelPageCachesFromIdb } from "@/lib/channelPageClientCache";
import { createIdbSwrProvider } from "@/lib/swrIdbProvider";
import {
  type InitialThemeSettings,
  type ThemeMode,
  LEGACY_THEME_DARK_PRESET_COOKIE,
  LEGACY_THEME_DARK_PRESET_STORAGE_KEY,
  LEGACY_THEME_LIGHT_PRESET_COOKIE,
  LEGACY_THEME_LIGHT_PRESET_STORAGE_KEY,
  THEME_MODE_COOKIE,
  THEME_MODE_STORAGE_KEY,
  normalizeThemeMode,
} from "@/lib/themePersistence";
import {
  LIBRARY_SIDEBAR_COLLAPSED_STORAGE_KEY,
  librarySidebarCollapsedToStorageValue,
  parseLibrarySidebarCollapsedCookie,
} from "@/lib/librarySidebarPersistence";
import {
  WATCH_NARROW_PLAYER_LAYOUT_STORAGE_KEY,
  parseWatchNarrowPlayerLayoutCookie,
  watchNarrowPlayerLayoutToStorageValue,
} from "@/lib/watchNarrowPlayerLayoutPersistence";
import { createSsrMatchMedia } from "@/lib/compactLayoutSsr";
import { themeStorageManager } from "@/lib/themeStorageManager";
import { createAppTheme } from "@/theme/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (m: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

type WatchCommentsVisibleContextValue = {
  visible: boolean;
  setWatchCommentsVisible: (visible: boolean) => void;
};

const WatchCommentsVisibleContext =
  createContext<WatchCommentsVisibleContextValue | null>(null);

type WatchUpNextVisibleContextValue = {
  visible: boolean;
  setWatchUpNextVisible: (visible: boolean) => void;
};

const WatchUpNextVisibleContext =
  createContext<WatchUpNextVisibleContextValue | null>(null);

type WatchNarrowPlayerLayoutContextValue = {
  enabled: boolean;
  setWatchNarrowPlayerLayout: (enabled: boolean) => void;
};

const WatchNarrowPlayerLayoutContext =
  createContext<WatchNarrowPlayerLayoutContextValue | null>(null);

type LibrarySidebarCollapsedContextValue = {
  collapsed: boolean;
  setLibrarySidebarCollapsed: (collapsed: boolean) => void;
};

const LibrarySidebarCollapsedContext =
  createContext<LibrarySidebarCollapsedContextValue | null>(null);

function readStoredThemeMode(): ThemeMode | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return normalizeThemeMode(localStorage.getItem(THEME_MODE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

function systemThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
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

function clearLegacyThemeCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
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

function removeThemeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function clearLegacyThemeStorage(): void {
  removeThemeStorage(LEGACY_THEME_DARK_PRESET_STORAGE_KEY);
  removeThemeStorage(LEGACY_THEME_LIGHT_PRESET_STORAGE_KEY);
  clearLegacyThemeCookie(LEGACY_THEME_DARK_PRESET_COOKIE);
  clearLegacyThemeCookie(LEGACY_THEME_LIGHT_PRESET_COOKIE);
}

function readStoredLibrarySidebarCollapsed(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(LIBRARY_SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (raw == null || raw === "") return undefined;
    return parseLibrarySidebarCollapsedCookie(raw);
  } catch {
    return undefined;
  }
}

function writeLibrarySidebarStorage(collapsed: boolean): void {
  try {
    localStorage.setItem(
      LIBRARY_SIDEBAR_COLLAPSED_STORAGE_KEY,
      librarySidebarCollapsedToStorageValue(collapsed),
    );
  } catch {
    /* ignore */
  }
}

function readStoredWatchNarrowPlayerLayout(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(WATCH_NARROW_PLAYER_LAYOUT_STORAGE_KEY);
    if (raw == null || raw === "") return undefined;
    return parseWatchNarrowPlayerLayoutCookie(raw);
  } catch {
    return undefined;
  }
}

function writeWatchNarrowPlayerLayoutStorage(enabled: boolean): void {
  try {
    localStorage.setItem(
      WATCH_NARROW_PLAYER_LAYOUT_STORAGE_KEY,
      watchNarrowPlayerLayoutToStorageValue(enabled),
    );
  } catch {
    /* ignore */
  }
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within AppProviders");
  return ctx;
}

export function useWatchCommentsVisible() {
  const ctx = useContext(WatchCommentsVisibleContext);
  if (!ctx) {
    throw new Error(
      "useWatchCommentsVisible must be used within AppProviders",
    );
  }
  return ctx;
}

export function useWatchUpNextVisible() {
  const ctx = useContext(WatchUpNextVisibleContext);
  if (!ctx) {
    throw new Error("useWatchUpNextVisible must be used within AppProviders");
  }
  return ctx;
}

export function useWatchNarrowPlayerLayout() {
  const ctx = useContext(WatchNarrowPlayerLayoutContext);
  if (!ctx) {
    throw new Error(
      "useWatchNarrowPlayerLayout must be used within AppProviders",
    );
  }
  return ctx;
}

export function useLibrarySidebarCollapsed() {
  const ctx = useContext(LibrarySidebarCollapsedContext);
  if (!ctx) {
    throw new Error(
      "useLibrarySidebarCollapsed must be used within AppProviders",
    );
  }
  return ctx;
}

function resolveThemeMode(
  mode: ReturnType<typeof useColorScheme>["mode"],
  fallback: ThemeMode,
): ThemeMode {
  return mode === "light" || mode === "dark" ? mode : fallback;
}

function ThemeModeBridge({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: InitialThemeSettings;
}) {
  const { mode: colorSchemeMode, setMode: setColorSchemeMode } =
    useColorScheme();
  const mode = resolveThemeMode(colorSchemeMode, initialTheme.mode);

  useEffect(() => {
    clearLegacyThemeStorage();
  }, []);

  useEffect(() => {
    if (initialTheme.hasStoredCookie) return;
    const stored = readStoredThemeMode() ?? systemThemeMode();
    setColorSchemeMode(stored);
    writeThemeCookie(THEME_MODE_COOKIE, stored);
    writeThemeStorage(THEME_MODE_STORAGE_KEY, stored);
  }, [initialTheme.hasStoredCookie, setColorSchemeMode]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setColorSchemeMode(next);
    },
    [setColorSchemeMode],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode,
      setMode,
    }),
    [mode, toggleMode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
  );
}

export function AppProviders({
  children,
  initialTheme,
  initialWatchCommentsVisible,
  initialWatchUpNextVisible,
  initialWatchNarrowPlayerLayout,
  initialLibrarySidebarCollapsed,
  initialCompactLayoutHint,
  librarySidebarHasCookie,
  watchNarrowPlayerLayoutHasCookie,
}: {
  children: React.ReactNode;
  initialTheme: InitialThemeSettings;
  initialWatchCommentsVisible: boolean;
  initialWatchUpNextVisible: boolean;
  initialWatchNarrowPlayerLayout: boolean;
  initialLibrarySidebarCollapsed: boolean;
  initialCompactLayoutHint: CompactLayoutHint;
  librarySidebarHasCookie: boolean;
  watchNarrowPlayerLayoutHasCookie: boolean;
}) {
  const [watchCommentsVisible, setWatchCommentsVisibleState] = useState(
    initialWatchCommentsVisible,
  );
  const [watchUpNextVisible, setWatchUpNextVisibleState] = useState(
    initialWatchUpNextVisible,
  );
  const [watchNarrowPlayerLayout, setWatchNarrowPlayerLayoutState] = useState(
    initialWatchNarrowPlayerLayout,
  );

  useEffect(() => {
    hydrateChannelPageCachesFromIdb();
  }, []);
  const [librarySidebarCollapsed, setLibrarySidebarCollapsedState] = useState(
    initialLibrarySidebarCollapsed,
  );

  useEffect(() => {
    if (librarySidebarHasCookie) return;
    const stored = readStoredLibrarySidebarCollapsed();
    if (stored === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time migration from localStorage-only preference
    setLibrarySidebarCollapsedState(stored);
    void setLibrarySidebarCollapsedAction(stored);
  }, [librarySidebarHasCookie]);

  useEffect(() => {
    if (watchNarrowPlayerLayoutHasCookie) return;
    const stored = readStoredWatchNarrowPlayerLayout();
    if (stored === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time migration from localStorage-only preference
    setWatchNarrowPlayerLayoutState(stored);
    void setWatchNarrowPlayerLayoutAction(stored);
  }, [watchNarrowPlayerLayoutHasCookie]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LIBRARY_SIDEBAR_COLLAPSED_STORAGE_KEY || e.newValue == null) {
        return;
      }
      const next = parseLibrarySidebarCollapsedCookie(e.newValue);
      setLibrarySidebarCollapsedState(next);
      void setLibrarySidebarCollapsedAction(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setWatchCommentsVisible = useCallback((next: boolean) => {
    setWatchCommentsVisibleState(next);
    void setWatchCommentsVisibleAction(next);
  }, []);

  const setWatchUpNextVisible = useCallback((next: boolean) => {
    setWatchUpNextVisibleState(next);
    void setWatchUpNextVisibleAction(next);
  }, []);

  const setWatchNarrowPlayerLayout = useCallback((next: boolean) => {
    setWatchNarrowPlayerLayoutState(next);
    writeWatchNarrowPlayerLayoutStorage(next);
    void setWatchNarrowPlayerLayoutAction(next);
  }, []);

  const setLibrarySidebarCollapsed = useCallback((next: boolean) => {
    setLibrarySidebarCollapsedState(next);
    writeLibrarySidebarStorage(next);
    void setLibrarySidebarCollapsedAction(next);
  }, []);

  const ssrMatchMedia = useMemo(
    () => createSsrMatchMedia(initialCompactLayoutHint),
    [initialCompactLayoutHint],
  );

  const theme = useMemo(
    () => createAppTheme({ ssrMatchMedia }),
    [ssrMatchMedia],
  );

  const watchCommentsVisibleValue = useMemo(
    () => ({
      visible: watchCommentsVisible,
      setWatchCommentsVisible,
    }),
    [watchCommentsVisible, setWatchCommentsVisible],
  );

  const watchUpNextVisibleValue = useMemo(
    () => ({
      visible: watchUpNextVisible,
      setWatchUpNextVisible,
    }),
    [watchUpNextVisible, setWatchUpNextVisible],
  );

  const watchNarrowPlayerLayoutValue = useMemo(
    () => ({
      enabled: watchNarrowPlayerLayout,
      setWatchNarrowPlayerLayout,
    }),
    [watchNarrowPlayerLayout, setWatchNarrowPlayerLayout],
  );

  const librarySidebarCollapsedValue = useMemo(
    () => ({
      collapsed: librarySidebarCollapsed,
      setLibrarySidebarCollapsed,
    }),
    [librarySidebarCollapsed, setLibrarySidebarCollapsed],
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider
        theme={theme}
        defaultMode={initialTheme.mode}
        modeStorageKey={THEME_MODE_STORAGE_KEY}
        storageManager={themeStorageManager}
        disableTransitionOnChange
      >
        <ThemeModeBridge initialTheme={initialTheme}>
          <LibrarySidebarCollapsedContext.Provider
            value={librarySidebarCollapsedValue}
          >
            <WatchUpNextVisibleContext.Provider value={watchUpNextVisibleValue}>
              <WatchNarrowPlayerLayoutContext.Provider
                value={watchNarrowPlayerLayoutValue}
              >
                <WatchCommentsVisibleContext.Provider
                  value={watchCommentsVisibleValue}
                >
                  <CssBaseline enableColorScheme />
                  <NavigationProgressProvider>
                  <SWRConfig
                    value={{
                      provider: createIdbSwrProvider(),
                      keepPreviousData: true,
                      revalidateOnFocus: false,
                      shouldRetryOnError: true,
                      errorRetryCount: 2,
                    }}
                  >
                      <CompactLayoutProvider initialHint={initialCompactLayoutHint}>
                        <BrowseLayoutProvider>{children}</BrowseLayoutProvider>
                      </CompactLayoutProvider>
                    </SWRConfig>
                  </NavigationProgressProvider>
                </WatchCommentsVisibleContext.Provider>
              </WatchNarrowPlayerLayoutContext.Provider>
            </WatchUpNextVisibleContext.Provider>
          </LibrarySidebarCollapsedContext.Provider>
        </ThemeModeBridge>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
