export const WATCH_PLAYER_TOOLBAR_VISIBLE_STORAGE_KEY =
  "cleantube-watch-player-toolbar-visible";

export function readWatchPlayerToolbarVisible(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(WATCH_PLAYER_TOOLBAR_VISIBLE_STORAGE_KEY);
    if (raw == null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

export function writeWatchPlayerToolbarVisible(visible: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      WATCH_PLAYER_TOOLBAR_VISIBLE_STORAGE_KEY,
      visible ? "1" : "0",
    );
  } catch {
    /* ignore */
  }
}
