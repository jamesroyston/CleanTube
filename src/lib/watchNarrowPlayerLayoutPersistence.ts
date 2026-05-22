/**
 * Watch page: reserve Up next column width on large screens so the player stays
 * lg:8 even when the related-videos rail is hidden.
 * Cookie + localStorage mirror library-sidebar pattern for SSR.
 */

export const WATCH_NARROW_PLAYER_LAYOUT_COOKIE =
  "cleantube-watch-narrow-player-layout";
export const WATCH_NARROW_PLAYER_LAYOUT_STORAGE_KEY =
  "cleantube-watch-narrow-player-layout";

/** Default: full-width player when Up next is off. */
export function parseWatchNarrowPlayerLayoutCookie(
  value: string | undefined | null,
): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

export function watchNarrowPlayerLayoutToStorageValue(enabled: boolean): string {
  return enabled ? "1" : "0";
}
