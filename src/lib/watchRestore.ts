const ACTIVE_WATCH_KEY = "cleantube-active-watch";
const LAUNCH_HANDLED_KEY = "cleantube-launch-handled";

/** Older markers are ignored so a long-forgotten video doesn't hijack launch. */
export const WATCH_RESTORE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type ActiveWatchMarker = {
  videoId: string;
  href: string;
  savedAt: number;
};

function watchHrefWithoutStart(videoId: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("t");
  params.delete("start");
  const qs = params.toString();
  return `/watch/${encodeURIComponent(videoId)}${qs ? `?${qs}` : ""}`;
}

/** Records that `/watch/[videoId]` is the visible page, for cold-launch restore. */
export function markActiveWatch(videoId: string): void {
  if (typeof window === "undefined") return;
  if (!window.location.pathname.startsWith("/watch/")) return;
  try {
    const marker: ActiveWatchMarker = {
      videoId,
      href: watchHrefWithoutStart(videoId, window.location.search),
      savedAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_WATCH_KEY, JSON.stringify(marker));
  } catch {
    /* ignore */
  }
}

export function readActiveWatch(): ActiveWatchMarker | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_WATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const { videoId, href, savedAt } = parsed as Record<string, unknown>;
    if (
      typeof videoId !== "string" ||
      typeof href !== "string" ||
      typeof savedAt !== "number" ||
      !Number.isFinite(savedAt) ||
      !href.startsWith("/watch/")
    ) {
      return null;
    }
    return { videoId, href, savedAt };
  } catch {
    return null;
  }
}

export function clearActiveWatch(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_WATCH_KEY);
  } catch {
    /* ignore */
  }
}

/** `true` when the current URL is the one the document was loaded at (no client nav yet). */
export function isAtDocumentEntryUrl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const [entry] = performance.getEntriesByType("navigation");
    if (!entry) return true;
    const loaded = new URL(entry.name, window.location.origin);
    return (
      loaded.pathname === window.location.pathname &&
      loaded.search === window.location.search
    );
  } catch {
    return true;
  }
}

let launchHandledInModule = false;

/**
 * Returns `true` only for the first call of this JS session (survives reloads via
 * sessionStorage, which iOS drops when it kills the PWA process).
 */
export function claimColdLaunch(): boolean {
  if (typeof window === "undefined") return false;
  if (launchHandledInModule) return false;
  launchHandledInModule = true;
  try {
    if (sessionStorage.getItem(LAUNCH_HANDLED_KEY)) return false;
    sessionStorage.setItem(LAUNCH_HANDLED_KEY, "1");
  } catch {
    /* sessionStorage unavailable: module flag still guards this session */
  }
  return true;
}
