import {
  LEGACY_FOCUS_MODE_COOKIE,
  WATCH_LAYOUT_COOKIE,
  parseWatchLayoutCookie,
} from "@/lib/watchLayoutPersistence";

export const WATCH_UP_NEXT_VISIBLE_COOKIE = "cleantube-watch-up-next-visible";

/** Default: Up next rail off (lower watch-page server work). */
export function parseWatchUpNextVisibleCookie(
  value: string | undefined | null,
): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

type CookieJar = {
  get(name: string): { value: string } | undefined;
};

/**
 * SSR + first paint: explicit Up next cookie wins; if unset, migrate from legacy
 * `cleantube-watch-layout` (`up_next` vs `theatre`) so existing users keep behavior.
 */
export function readWatchUpNextVisibleFromCookieStore(
  jar: CookieJar,
): boolean {
  const raw = jar.get(WATCH_UP_NEXT_VISIBLE_COOKIE)?.value;
  if (raw != null && raw !== "") {
    return parseWatchUpNextVisibleCookie(raw);
  }
  const legacyLayout = parseWatchLayoutCookie(
    jar.get(WATCH_LAYOUT_COOKIE)?.value,
    jar.get(LEGACY_FOCUS_MODE_COOKIE)?.value,
  );
  return legacyLayout === "up_next";
}
