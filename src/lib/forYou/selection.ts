import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";
import type { SavedChannel } from "@/types/savedChannel";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { WatchProgressEntry } from "@/types/watchProgress";

import { isStaleInProgress } from "@/lib/cloudLibrary/sync";

/** How long a completed watch can seed "Because you watched" sections. */
export const HISTORY_SEED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Only searches within this window influence the feed. */
export const RECENT_SEARCH_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const RECENT_SEARCH_FEED_MAX_QUERIES = 3;

function normalizeChannelName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** UTC date key for daily feed rotation. */
export function forYouDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function latestWatchMsForChannel(
  channelName: string,
  watchProgress: WatchProgressEntry[],
): number {
  const key = normalizeChannelName(channelName);
  if (!key) return 0;

  let latest = 0;
  for (const entry of watchProgress) {
    if (normalizeChannelName(entry.channelName) !== key) continue;
    const t = Date.parse(entry.lastWatchedAt);
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  return latest;
}

/**
 * Pick saved channels for today's feed: recently watched channels first,
 * then rotate through the rest so sections change day to day.
 */
export function selectSavedChannelsForFeed(
  savedChannels: SavedChannel[],
  watchProgress: WatchProgressEntry[],
  max: number,
  dayKey: string,
): SavedChannel[] {
  const channels = savedChannels.filter(
    (c) => effectiveSavedChannelKind(c) === "saved_channel",
  );
  if (channels.length <= max) return channels;

  const ranked = [...channels].sort((a, b) => {
    const activityDelta =
      latestWatchMsForChannel(b.name, watchProgress) -
      latestWatchMsForChannel(a.name, watchProgress);
    if (activityDelta !== 0) return activityDelta;
    return a.name.localeCompare(b.name);
  });

  const hotCount = Math.min(2, max);
  const hot = ranked.slice(0, hotCount);
  const rest = ranked.slice(hotCount);
  if (rest.length === 0) return hot;

  const offset = hashString(dayKey) % rest.length;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];
  const slots = max - hot.length;
  return [...hot, ...rotated.slice(0, slots)];
}

export function isRecentEnoughHistorySeed(entry: WatchProgressEntry): boolean {
  if (isStaleInProgress(entry)) return false;
  const t = Date.parse(entry.lastWatchedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t <= HISTORY_SEED_MAX_AGE_MS;
}

export function recentSearchesForFeed(
  entries: RecentSearchEntry[],
  max = RECENT_SEARCH_FEED_MAX_QUERIES,
): RecentSearchEntry[] {
  const cutoff = Date.now() - RECENT_SEARCH_MAX_AGE_MS;
  return entries
    .filter((entry) => {
      const t = Date.parse(entry.searchedAt);
      return Number.isFinite(t) && t >= cutoff;
    })
    .slice(0, max);
}
