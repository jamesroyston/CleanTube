import type { SavedChannel } from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

function isoToMs(value: string | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || undefined;
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return trimmed.replace(/\/$/, "").toLowerCase();
  }
}

function channelAliases(channel: SavedChannel): string[] {
  const aliases = new Set<string>();
  const channelId = normalizeText(channel.channelId);
  const channelUrl = normalizeUrl(channel.channelUrl);
  const searchQuery = normalizeText(channel.searchQuery);

  if (channelId) aliases.add(`id:${channelId}`);
  if (channelUrl) aliases.add(`url:${channelUrl}`);
  if (searchQuery) aliases.add(`query:${searchQuery}`);

  return Array.from(aliases);
}

function hasBetterChannelName(channel: SavedChannel): boolean {
  return (
    Boolean(channel.name.trim()) &&
    normalizeText(channel.name) !== normalizeText(channel.searchQuery)
  );
}

function mergeSavedChannel(
  existing: SavedChannel,
  incoming: SavedChannel,
): SavedChannel {
  const preferredName = hasBetterChannelName(existing)
    ? existing.name
    : hasBetterChannelName(incoming)
      ? incoming.name
      : existing.name || incoming.name;

  return {
    id: existing.id || incoming.id,
    name: preferredName,
    channelId: existing.channelId ?? incoming.channelId,
    channelUrl: existing.channelUrl ?? incoming.channelUrl,
    searchQuery: existing.searchQuery || incoming.searchQuery,
  };
}

export function mergeSavedChannels(
  localChannels: SavedChannel[],
  remoteChannels: SavedChannel[],
): SavedChannel[] {
  const merged: SavedChannel[] = [];
  const aliasToIndex = new Map<string, number>();

  for (const channel of [...remoteChannels, ...localChannels]) {
    const aliases = channelAliases(channel);
    const matchingIndexes = Array.from(
      new Set(
        aliases
          .map((alias) => aliasToIndex.get(alias))
          .filter((index): index is number => index != null),
      ),
    ).sort((a, b) => a - b);

    if (matchingIndexes.length === 0) {
      const nextIndex = merged.length;
      merged.push(channel);
      for (const alias of aliases) aliasToIndex.set(alias, nextIndex);
      continue;
    }

    const targetIndex = matchingIndexes[0];
    let nextChannel = mergeSavedChannel(merged[targetIndex], channel);

    for (const duplicateIndex of matchingIndexes.slice(1).reverse()) {
      nextChannel = mergeSavedChannel(nextChannel, merged[duplicateIndex]);
      merged.splice(duplicateIndex, 1);
    }

    merged[targetIndex] = nextChannel;
    aliasToIndex.clear();
    for (const [index, entry] of merged.entries()) {
      for (const alias of channelAliases(entry)) aliasToIndex.set(alias, index);
    }
  }

  return merged;
}

function isFallbackText(
  value: string | undefined,
  fallback: string,
): boolean {
  return !value?.trim() || value.trim().toLowerCase() === fallback.toLowerCase();
}

function preferWatchLaterText(
  preferred: string,
  fallback: string,
  fallbackLabel: string,
): string {
  if (!isFallbackText(preferred, fallbackLabel)) return preferred;
  if (!isFallbackText(fallback, fallbackLabel)) return fallback;
  return preferred || fallback;
}

function mergeWatchLaterEntry(
  existing: WatchLaterEntry,
  incoming: WatchLaterEntry,
): WatchLaterEntry {
  const incomingIsNewer = isoToMs(incoming.addedAt) >= isoToMs(existing.addedAt);
  const newer = incomingIsNewer ? incoming : existing;
  const older = incomingIsNewer ? existing : incoming;
  const startSeconds = Math.max(
    existing.startSeconds ?? 0,
    incoming.startSeconds ?? 0,
  );

  return {
    ...newer,
    title: preferWatchLaterText(newer.title, older.title, "Video"),
    channelName: preferWatchLaterText(
      newer.channelName,
      older.channelName,
      "Unknown channel",
    ),
    thumbnailUrl: newer.thumbnailUrl || older.thumbnailUrl,
    startSeconds: startSeconds > 0 ? startSeconds : undefined,
  };
}

export function mergeWatchLaterEntries(
  localEntries: WatchLaterEntry[],
  remoteEntries: WatchLaterEntry[],
): WatchLaterEntry[] {
  const merged = new Map<string, WatchLaterEntry>();
  for (const entry of [...remoteEntries, ...localEntries]) {
    const existing = merged.get(entry.videoId);
    if (existing) {
      merged.set(entry.videoId, mergeWatchLaterEntry(existing, entry));
    } else {
      merged.set(entry.videoId, entry);
    }
  }
  return Array.from(merged.values()).sort(
    (a, b) => isoToMs(b.addedAt) - isoToMs(a.addedAt),
  );
}

export function mergeWatchProgressEntries(
  localEntries: WatchProgressEntry[],
  remoteEntries: WatchProgressEntry[],
): WatchProgressEntry[] {
  const merged = new Map<string, WatchProgressEntry>();
  for (const entry of [...remoteEntries, ...localEntries]) {
    const existing = merged.get(entry.videoId);
    if (!existing || isoToMs(entry.updatedAt) >= isoToMs(existing.updatedAt)) {
      merged.set(entry.videoId, {
        ...entry,
        lastPositionSeconds: Math.max(
          entry.lastPositionSeconds,
          existing?.lastPositionSeconds ?? 0,
        ),
        completed: entry.completed || existing?.completed === true,
      });
    }
  }
  return Array.from(merged.values()).sort(
    (a, b) => isoToMs(b.updatedAt) - isoToMs(a.updatedAt),
  );
}

export function deriveResumeSeconds(
  progress: WatchProgressEntry | undefined,
  watchLaterStartSeconds: number | undefined,
): number | undefined {
  if (
    progress &&
    !progress.completed &&
    progress.lastPositionSeconds > 0
  ) {
    return progress.lastPositionSeconds;
  }
  if (
    watchLaterStartSeconds != null &&
    Number.isFinite(watchLaterStartSeconds) &&
    watchLaterStartSeconds > 0
  ) {
    return Math.floor(watchLaterStartSeconds);
  }
  return undefined;
}

export function isInProgress(entry: WatchProgressEntry): boolean {
  return !entry.completed && entry.lastPositionSeconds > 0;
}
