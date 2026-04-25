import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
  type ResultSortMode,
  type SearchSortMode,
} from "@/lib/uploadedAtSort";

const SESSION_KEY = "cleantube-last-search-query";
const SEARCH_SORT_KEY = "cleantube-last-search-sort";
const RESULT_SORT_KEY = "cleantube-last-result-sort";

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

export function setLastSearchSort(mode: SearchSortMode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === "relevance") sessionStorage.removeItem(SEARCH_SORT_KEY);
    else sessionStorage.setItem(SEARCH_SORT_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function getLastSearchSort(): SearchSortMode {
  if (typeof window === "undefined") return "relevance";
  try {
    return normalizeSearchSortParam(sessionStorage.getItem(SEARCH_SORT_KEY));
  } catch {
    return "relevance";
  }
}

export function setLastResultSort(mode: ResultSortMode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === "search") sessionStorage.removeItem(RESULT_SORT_KEY);
    else sessionStorage.setItem(RESULT_SORT_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function getLastResultSort(): ResultSortMode {
  if (typeof window === "undefined") return "search";
  try {
    return normalizeResultSortParam(sessionStorage.getItem(RESULT_SORT_KEY));
  } catch {
    return "search";
  }
}

export function getBackToSearchHref(): string {
  const q = getLastSearchQuery()?.trim();
  if (!q) return "/";
  const searchSort = getLastSearchSort();
  const resultSort = getLastResultSort();
  const qs = new URLSearchParams();
  qs.set("q", q);
  if (searchSort !== "relevance") qs.set("searchSort", searchSort);
  if (resultSort !== "search") qs.set("resultSort", resultSort);
  return `/?${qs.toString()}`;
}
