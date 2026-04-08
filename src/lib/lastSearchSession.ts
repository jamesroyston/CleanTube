const SESSION_KEY = "cleantube-last-search-query";

export function setLastSearchQuery(q: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, q);
  } catch {
    /* ignore */
  }
}

export function getLastSearchQuery(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function getBackToSearchHref(): string {
  const q = getLastSearchQuery()?.trim();
  if (q) return `/?q=${encodeURIComponent(q)}`;
  return "/";
}
