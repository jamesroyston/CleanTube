import type { SavedChannel } from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

function isoToMs(value: string | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function channelKey(channel: SavedChannel): string {
  if (channel.channelId) return `id:${channel.channelId}`;
  if (channel.channelUrl) return `url:${channel.channelUrl}`;
  return `query:${channel.searchQuery.trim().toLowerCase()}`;
}

export function mergeSavedChannels(
  localChannels: SavedChannel[],
  remoteChannels: SavedChannel[],
): SavedChannel[] {
  const merged = new Map<string, SavedChannel>();
  for (const channel of [...remoteChannels, ...localChannels]) {
    const key = channelKey(channel);
    if (!merged.has(key)) merged.set(key, channel);
  }
  return Array.from(merged.values());
}

export function mergeWatchLaterEntries(
  localEntries: WatchLaterEntry[],
  remoteEntries: WatchLaterEntry[],
): WatchLaterEntry[] {
  const merged = new Map<string, WatchLaterEntry>();
  for (const entry of [...remoteEntries, ...localEntries]) {
    const existing = merged.get(entry.videoId);
    if (!existing || isoToMs(entry.addedAt) >= isoToMs(existing.addedAt)) {
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
