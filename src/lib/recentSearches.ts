const STORAGE_KEY = "cleantube-recent-searches";
const MAX_ITEMS = 15;

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function getRecentSearches(): string[] {
  return readRaw();
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return;
  try {
    const prev = readRaw().filter(
      (q) => q.toLowerCase() !== trimmed.toLowerCase(),
    );
    const next = [trimmed, ...prev].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function removeRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return;
  try {
    const prev = readRaw().filter(
      (q) => q.toLowerCase() !== trimmed.toLowerCase(),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
  } catch {
    /* ignore */
  }
}
