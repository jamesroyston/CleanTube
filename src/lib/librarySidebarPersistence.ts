/**
 * Library rail (desktop): collapsed mini rail vs expanded drawer width.
 * Cookie + localStorage mirror (theme-style) for SSR and multi-tab sync.
 */

export const LIBRARY_SIDEBAR_COLLAPSED_COOKIE = "cleantube-library-sidebar-collapsed";
export const LIBRARY_SIDEBAR_COLLAPSED_STORAGE_KEY =
  "cleantube-library-sidebar-collapsed";

/** Default: expanded (full labels). */
export function parseLibrarySidebarCollapsedCookie(
  value: string | undefined | null,
): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

export function librarySidebarCollapsedToStorageValue(collapsed: boolean): string {
  return collapsed ? "1" : "0";
}
