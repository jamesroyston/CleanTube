import type { SavedChannel } from "@/types/savedChannel";
import type { WatchProgressEntry } from "@/types/watchProgress";

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

function savedChannelCanonicalAliasKeys(channel: SavedChannel): string[] {
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
    thumbnailUrl: existing.thumbnailUrl ?? incoming.thumbnailUrl,
    searchQuery: existing.searchQuery || incoming.searchQuery,
  };
}

/** Dedupe saved channels by canonical aliases (client-side list hygiene). */
export function mergeSavedChannels(
  localChannels: SavedChannel[],
  remoteChannels: SavedChannel[],
): SavedChannel[] {
  const merged: SavedChannel[] = [];
  const aliasToIndex = new Map<string, number>();

  for (const channel of [...remoteChannels, ...localChannels]) {
    const aliases = savedChannelCanonicalAliasKeys(channel);
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
      for (const alias of savedChannelCanonicalAliasKeys(entry)) {
        aliasToIndex.set(alias, index);
      }
    }
  }

  return merged;
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
