/**
 * "Theatre focus" — hide the Up next / related column on the watch page for fewer distractions.
 * Stored in localStorage + a cookie (same pattern as theme) for SSR and instant toggles.
 */
export const FOCUS_MODE_STORAGE_KEY = "cleantube-theatre-focus";
export const FOCUS_MODE_COOKIE = "cleantube-theatre-focus";

/** When true, the watch page omits the related-videos column. */
export function parseFocusModeCookie(value: string | undefined | null): boolean {
  return value === "1" || value === "on" || value === "true";
}
