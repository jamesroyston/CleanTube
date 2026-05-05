export const WATCH_COMMENTS_VISIBLE_COOKIE = "cleantube-watch-comments-visible";

/** Default: comments off (faster watch page; enable in Account menu). */
export function parseWatchCommentsVisibleCookie(
  value: string | undefined | null,
): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}
