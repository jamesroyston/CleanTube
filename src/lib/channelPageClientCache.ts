import type { ChannelSortMode, ChannelVideosPage } from "@/lib/youtubeTypes";

const STORAGE_PREFIX = "cleantube:channel-page:v2:";

/**
 * Session-only fallback when the server returns no channel grid (see ChannelRecoverable).
 * Keys are per channel/sort/page; clearing removes all backups for this origin.
 */
export function clearChannelPageSessionBackups(): number {
  if (typeof window === "undefined") return 0;
  const prefix = "cleantube:channel-page:";
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(prefix)) keys.push(k);
  }
  for (const k of keys) {
    sessionStorage.removeItem(k);
  }
  return keys.length;
}

export type CachedChannelPagePayload = {
  v: 2;
  savedAt: number;
  page: ChannelVideosPage;
};

export function buildChannelPageCacheKey(input: {
  channelId: string;
  sort: ChannelSortMode;
  pageToken?: string;
}): string {
  const page = input.pageToken?.trim() || "1";
  return `${STORAGE_PREFIX}${input.channelId}:${input.sort}:${page}`;
}

export function readChannelPageCache(
  key: string,
): ChannelVideosPage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChannelPagePayload;
    if (parsed?.v !== 2 || !parsed.page?.channel?.id) return null;
    return parsed.page;
  } catch {
    return null;
  }
}

export function writeChannelPageCache(
  key: string,
  page: ChannelVideosPage,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedChannelPagePayload = {
      v: 2,
      savedAt: Date.now(),
      page,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
