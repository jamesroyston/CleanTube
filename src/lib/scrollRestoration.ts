const SCROLL_KEY_PREFIX = "cleantube-scroll:";

export type SavedScrollPosition = {
  scrollTop: number;
  videoId?: string;
};

function scrollStorageKey(pathname: string, search: string): string {
  const qs = search.replace(/^\?/, "");
  return `${SCROLL_KEY_PREFIX}${pathname}${qs ? `?${qs}` : ""}`;
}

export function saveScrollPosition(
  pathname: string,
  search: string,
  position: SavedScrollPosition,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      scrollStorageKey(pathname, search),
      JSON.stringify(position),
    );
  } catch {
    /* ignore */
  }
}

export function peekScrollPosition(
  pathname: string,
  search: string,
): SavedScrollPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(scrollStorageKey(pathname, search));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedScrollPosition;
    if (typeof parsed.scrollTop !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function consumeScrollPosition(
  pathname: string,
  search: string,
): SavedScrollPosition | null {
  const saved = peekScrollPosition(pathname, search);
  if (!saved) return null;
  clearScrollPosition(pathname, search);
  return saved;
}

export function clearScrollPosition(pathname: string, search: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(scrollStorageKey(pathname, search));
  } catch {
    /* ignore */
  }
}

export function readCurrentScrollTop(
  scrollElement: HTMLElement | Window | null,
): number {
  if (!scrollElement) return 0;
  if (scrollElement === window) return window.scrollY;
  return (scrollElement as HTMLElement).scrollTop;
}

export function applyScrollPosition(
  scrollElement: HTMLElement | Window | null,
  position: SavedScrollPosition,
): boolean {
  if (!scrollElement) return false;

  if (position.videoId) {
    const anchor = document.getElementById(
      `search-video-${position.videoId}`,
    );
    if (anchor) {
      anchor.scrollIntoView({ block: "center", behavior: "instant" });
      return true;
    }
  }

  if (scrollElement === window) {
    window.scrollTo({ top: position.scrollTop, behavior: "instant" });
  } else {
    (scrollElement as HTMLElement).scrollTop = position.scrollTop;
  }
  return true;
}
