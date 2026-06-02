const AUTH_RETURN_STORAGE_KEY = "cleantube-auth-return";

/** Same-origin post-auth destination; rejects external and `/auth` paths. */
export function sanitizeAuthNextPath(
  path: string | null | undefined,
): string {
  if (!path || typeof path !== "string") return "/";
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";

  try {
    const url = new URL(trimmed, "http://localhost");
    const pathname = url.pathname;
    if (pathname === "/auth" || pathname.startsWith("/auth/")) return "/";
    return `${pathname}${url.search}`;
  } catch {
    return "/";
  }
}

/** `/auth?next=...` for the current browse location; mirrors return path in sessionStorage. */
export function buildAuthPageHref(
  fromPathname: string,
  search?: string,
): string {
  const from = search
    ? `${fromPathname}${search.startsWith("?") ? search : `?${search}`}`
    : fromPathname;
  const next = sanitizeAuthNextPath(from);

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  if (next === "/") return "/auth";
  return `/auth?next=${encodeURIComponent(next)}`;
}

export function getAuthReturnPathFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearAuthReturnPathStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Post-auth destination from `?next=` or sessionStorage fallback. */
export function resolveAuthReturnPath(
  nextParam: string | null | undefined,
): string {
  const fromUrl = nextParam?.trim();
  if (fromUrl) return sanitizeAuthNextPath(fromUrl);
  const fromStorage = getAuthReturnPathFromStorage();
  if (fromStorage) return sanitizeAuthNextPath(fromStorage);
  return "/";
}

/**
 * Full navigation after sign-in so SSR and client bootstrap both see fresh auth
 * cookies. Client `router.push` alone can render stale signed-out server props.
 */
export function completeAuthRedirect(
  nextParam: string | null | undefined,
): void {
  if (typeof window === "undefined") return;
  const destination = resolveAuthReturnPath(nextParam);
  clearAuthReturnPathStorage();
  window.location.assign(destination);
}
