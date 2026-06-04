import type { StorageManager } from "@mui/material/styles";

import {
  normalizeThemeMode,
  THEME_MODE_COOKIE,
} from "@/lib/themePersistence";

function writeThemeCookie(value: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${THEME_MODE_COOKIE}=${encodeURIComponent(
      value,
    )}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

/** MUI storageManager bridge — syncs cleantube-theme localStorage + cookie for SSR. */
export const themeStorageManager: StorageManager = ({ key, storageWindow }) => {
  const storage = storageWindow?.localStorage;
  return {
    get(defaultValue) {
      if (!storage) return defaultValue;
      try {
        const raw = storage.getItem(key);
        return normalizeThemeMode(raw) ?? defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set(value) {
      if (storage) {
        try {
          storage.setItem(key, String(value));
        } catch {
          /* ignore */
        }
      }
      writeThemeCookie(String(value));
    },
    subscribe(handler) {
      if (!storageWindow) return () => {};
      const onStorage = (event: StorageEvent) => {
        if (event.key === key && event.newValue) {
          handler(event.newValue);
        }
      };
      storageWindow.addEventListener("storage", onStorage);
      return () => storageWindow.removeEventListener("storage", onStorage);
    },
  };
};
