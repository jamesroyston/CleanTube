const HREF_KEY = "cleantube-watch-return-href";
const LABEL_KEY = "cleantube-watch-return-label";
const CHANNEL_LABEL_KEY = "cleantube-watch-return-channel-label";

export function setWatchReturnChannelLabel(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(CHANNEL_LABEL_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function getWatchReturnChannelLabel(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CHANNEL_LABEL_KEY);
  } catch {
    return null;
  }
}

export function clearWatchReturnTarget(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(HREF_KEY);
    sessionStorage.removeItem(LABEL_KEY);
  } catch {
    /* ignore */
  }
}

export function setWatchReturnTarget(href: string, label: string): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    if (url.pathname.startsWith("/watch/")) return;
    const stored = `${url.pathname}${url.search}`;
    sessionStorage.setItem(HREF_KEY, stored);
    sessionStorage.setItem(LABEL_KEY, label);
  } catch {
    /* ignore */
  }
}

export function getWatchReturnTarget(): { href: string; label: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const href = sessionStorage.getItem(HREF_KEY);
    const label = sessionStorage.getItem(LABEL_KEY);
    if (!href || !label) return null;
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname.startsWith("/watch/")) return null;
    return { href: `${url.pathname}${url.search}`, label };
  } catch {
    return null;
  }
}

export function deriveWatchReturnTarget(
  pathname: string,
  search: string,
): { href: string; label: string } | null {
  const href = search ? `${pathname}?${search}` : pathname;

  if (pathname === "/") {
    const q = new URLSearchParams(search).get("q")?.trim();
    return { href, label: q ? "Back to results" : "Search" };
  }

  if (pathname.startsWith("/channel/")) {
    const channelLabel = getWatchReturnChannelLabel();
    return {
      href,
      label: channelLabel ? `Back to ${channelLabel}` : "Back to channel",
    };
  }

  if (pathname === "/watch-later") {
    return { href, label: "Back to Watch later" };
  }

  if (pathname === "/history") {
    return { href, label: "Back to History" };
  }

  if (pathname === "/library") {
    return { href, label: "Back to Library" };
  }

  return null;
}

/** Call before navigating to a watch page so back link is correct on first paint. */
export function captureWatchReturnFromCurrentLocation(): void {
  if (typeof window === "undefined") return;
  const target = deriveWatchReturnTarget(
    window.location.pathname,
    window.location.search.replace(/^\?/, ""),
  );
  if (target) {
    setWatchReturnTarget(target.href, target.label);
  } else {
    clearWatchReturnTarget();
  }
}

/** Spread onto links/buttons that open `/watch/...`. */
export function watchNavigationCaptureHandlers(): {
  onPointerDown: () => void;
} {
  return {
    onPointerDown: () => captureWatchReturnFromCurrentLocation(),
  };
}
