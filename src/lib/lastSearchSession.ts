import {
  normalizeSortParam,
  type UploadDateSortMode,
} from "@/lib/uploadedAtSort";

const SESSION_KEY = "cleantube-last-search-query";
const SORT_KEY = "cleantube-last-search-sort";

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

export function setLastSearchSort(mode: UploadDateSortMode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === "relevance") sessionStorage.removeItem(SORT_KEY);
    else sessionStorage.setItem(SORT_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function getLastSearchSort(): UploadDateSortMode {
  if (typeof window === "undefined") return "relevance";
  try {
    return normalizeSortParam(sessionStorage.getItem(SORT_KEY));
  } catch {
    return "relevance";
  }
}

export function getBackToSearchHref(): string {
  const q = getLastSearchQuery()?.trim();
  if (!q) return "/";
  const sort = getLastSearchSort();
  const qs = new URLSearchParams();
  qs.set("q", q);
  if (sort !== "relevance") qs.set("sort", sort);
  return `/?${qs.toString()}`;
}
