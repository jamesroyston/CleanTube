/**
 * Watch page layout: Standard + Up next, or Theatre (maximize player in viewport).
 * Cookie + localStorage mirror theme pattern for SSR.
 */

export const WATCH_LAYOUT_COOKIE = "cleantube-watch-layout";
export const WATCH_LAYOUT_STORAGE_KEY = "cleantube-watch-layout";
/** Legacy boolean cookie from theatre-focus toggle */
export const LEGACY_FOCUS_MODE_COOKIE = "cleantube-theatre-focus";

export type WatchLayoutMode = "up_next" | "theatre";

const MODES: readonly WatchLayoutMode[] = ["up_next", "theatre"] as const;

/** Migrate removed `no_up_next` to theatre (still no related rail). */
export function normalizeStoredWatchLayout(
  raw: string | null | undefined,
): WatchLayoutMode | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (v === "up_next" || v === "theatre") return v;
  if (v === "no_up_next") return "theatre";
  return undefined;
}

export function watchLayoutToCookieValue(mode: WatchLayoutMode): string {
  return mode;
}

export function parseWatchLayoutCookie(
  value: string | undefined | null,
  legacyFocus?: string | undefined | null,
): WatchLayoutMode {
  const fromStored = normalizeStoredWatchLayout(value ?? undefined);
  if (fromStored) return fromStored;
  if (legacyFocus === "1" || legacyFocus === "on" || legacyFocus === "true") {
    return "theatre";
  }
  /** Default: no Up next rail (lower compute; user can enable in Account menu). */
  return "theatre";
}

export function isValidWatchLayoutMode(value: unknown): value is WatchLayoutMode {
  return typeof value === "string" && MODES.includes(value as WatchLayoutMode);
}
