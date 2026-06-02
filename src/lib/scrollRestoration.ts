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

function readScrollHeight(
  scrollElement: HTMLElement | Window | null,
): number {
  if (!scrollElement) return 0;
  if (scrollElement === window) {
    return document.documentElement.scrollHeight;
  }
  return (scrollElement as HTMLElement).scrollHeight;
}

function readViewportHeight(
  scrollElement: HTMLElement | Window | null,
): number {
  if (!scrollElement) return 0;
  if (scrollElement === window) return window.innerHeight;
  return (scrollElement as HTMLElement).clientHeight;
}

/** True when the scroll container can honor the saved offset (layout tall enough). */
export function canApplyScrollPosition(
  scrollElement: HTMLElement | Window | null,
  position: SavedScrollPosition,
): boolean {
  if (!scrollElement) return false;

  if (position.videoId) {
    return (
      document.getElementById(`search-video-${position.videoId}`) != null
    );
  }

  const maxScrollTop = Math.max(
    0,
    readScrollHeight(scrollElement) - readViewportHeight(scrollElement),
  );
  return maxScrollTop + 16 >= position.scrollTop;
}

export function isForYouFeedReady(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector("[data-for-you-feed-ready]") != null;
}

export function isChannelGridReady(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector("[data-channel-grid-ready]") != null;
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
    return false;
  }

  if (scrollElement === window) {
    window.scrollTo({ top: position.scrollTop, behavior: "instant" });
  } else {
    (scrollElement as HTMLElement).scrollTop = position.scrollTop;
  }
  return true;
}
