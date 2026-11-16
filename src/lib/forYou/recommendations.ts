import { parseHumanUploadedAgeSeconds } from "@/lib/uploadedAtSort";
import type { SavedChannel } from "@/types/savedChannel";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { WatchProgressEntry } from "@/types/watchProgress";
import type { VideoLikeForSummary } from "@/lib/youtubeTypes";

import type { ForYouCandidate, ForYouFeedLimits } from "./types";
import { DEFAULT_FOR_YOU_LIMITS } from "./types";

const SOURCE_WEIGHT: Record<ForYouCandidate["source"], number> = {
  saved_channel: 40,
  watch_next: 28,
  pinned_search: 16,
  recent_search: 10,
};

function normalizeChannelName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isCompletedProgress(entry: WatchProgressEntry | undefined): boolean {
  if (!entry) return false;
  return entry.completed === true || entry.everCompleted === true;
}

/**
 * Continue watching already surfaces in-progress videos. Recommending them
 * again, or a video the user hid, is what makes the feed feel repetitive.
 */
function alreadySeen(
  videoId: string,
  entry: WatchProgressEntry | undefined,
  dismissedVideoIds: ReadonlySet<string>,
): boolean {
  if (dismissedVideoIds.has(videoId)) return true;
  if (!entry) return false;
  if (isCompletedProgress(entry)) return true;
  return entry.lastPositionSeconds > 0;
}

function channelAffinityBoost(
  channelName: string,
  savedChannels: SavedChannel[],
  historyChannelCounts: Map<string, number>,
): number {
  const key = normalizeChannelName(channelName);
  if (!key) return 0;

  let boost = 0;
  for (const channel of savedChannels) {
    if (effectiveSavedChannelKind(channel) !== "saved_channel") continue;
    if (normalizeChannelName(channel.name) === key) {
      boost += 22;
      break;
    }
  }

  const historyHits = historyChannelCounts.get(key) ?? 0;
  if (historyHits >= 2) boost += 14;
  else if (historyHits === 1) boost += 6;

  return boost;
}

function uploadRecencyBoost(uploadedAt: string | undefined): number {
  const age = parseHumanUploadedAgeSeconds(uploadedAt);
  if (age == null) return 0;
  if (age <= 86400) return 12;
  if (age <= 7 * 86400) return 8;
  if (age <= 30 * 86400) return 4;
  return 0;
}

function scoreCandidate(
  candidate: ForYouCandidate,
  savedChannels: SavedChannel[],
  historyChannelCounts: Map<string, number>,
  progressByVideoId: Map<string, WatchProgressEntry>,
  dismissedVideoIds: ReadonlySet<string>,
): number {
  const video = candidate.video;
  const videoId = video.id.trim();
  const progress = progressByVideoId.get(videoId);
  if (alreadySeen(videoId, progress, dismissedVideoIds)) return -1;

  let score = SOURCE_WEIGHT[candidate.source] ?? 0;
  score += channelAffinityBoost(
    video.channelName ?? candidate.seedChannelName ?? "",
    savedChannels,
    historyChannelCounts,
  );
  score += uploadRecencyBoost(video.uploadedAt);

  // Related rows are mostly "more from this channel" unless we prefer
  // other creators. The channel's own uploads already have a section.
  if (
    candidate.source === "watch_next" &&
    normalizeChannelName(video.channelName) &&
    normalizeChannelName(video.channelName) ===
      normalizeChannelName(candidate.seedChannelName)
  ) {
    score -= 16;
  }

  if (video.live) score += 2;

  return score;
}

function buildHistoryChannelCounts(
  watchProgress: WatchProgressEntry[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of watchProgress) {
    const key = normalizeChannelName(entry.channelName);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

type ScoredVideo = {
  video: VideoLikeForSummary;
  score: number;
  channelKey: string;
};

function channelKeyFor(video: VideoLikeForSummary): string {
  const name = normalizeChannelName(video.channelName);
  return name || `video:${video.id}`;
}

function rotationOffset(
  rotationKey: string,
  channelKey: string,
  length: number,
): number {
  if (length <= 1) return 0;
  let hash = 0;
  const value = `${rotationKey}\0${channelKey}`;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

/** Keep the freshest couple of uploads, rotate the rest so a refresh isn't a rerun. */
function rotateScored(rows: ScoredVideo[], rotationKey: string): ScoredVideo[] {
  const anchorCount = Math.min(2, rows.length);
  const rest = rows.slice(anchorCount);
  if (rest.length <= 1) return rows;
  const offset = rotationOffset(
    rotationKey,
    rows[0]?.channelKey ?? "",
    rest.length,
  );
  if (offset === 0) return rows;
  return [
    ...rows.slice(0, anchorCount),
    ...rest.slice(offset),
    ...rest.slice(0, offset),
  ];
}

/**
 * Round-robin channels so a mixed row can't collapse to one creator.
 * A single-channel pool still fills every slot. If the mixed row is still
 * short, a second pass may pull more from whoever has videos left.
 */
function interleaveByChannel(
  scored: ScoredVideo[],
  maxResults: number,
  rotationKey: string,
): VideoLikeForSummary[] {
  if (maxResults <= 0) return [];

  const byChannel = new Map<string, ScoredVideo[]>();
  for (const row of scored) {
    const list = byChannel.get(row.channelKey);
    if (list) list.push(row);
    else byChannel.set(row.channelKey, [row]);
  }

  const groups = [...byChannel.values()]
    .map((rows) => {
      rows.sort((a, b) => b.score - a.score);
      return rotateScored(rows, rotationKey);
    })
    .sort((a, b) => (b[0]?.score ?? 0) - (a[0]?.score ?? 0));

  const only = groups[0];
  if (!only) return [];
  if (groups.length === 1) {
    return only.slice(0, maxResults).map((row) => row.video);
  }

  const targetChannels = Math.min(groups.length, 6);
  const perChannel = Math.max(
    3,
    Math.min(8, Math.ceil(maxResults / targetChannels)),
  );
  const cursors = groups.map(() => 0);
  const out: ScoredVideo[] = [];

  const pull = (cap: number | null) => {
    let progressed = true;
    while (out.length < maxResults && progressed) {
      progressed = false;
      for (let i = 0; i < groups.length && out.length < maxResults; i++) {
        const cursor = cursors[i] ?? 0;
        if (cap != null && cursor >= cap) continue;
        const row = groups[i]?.[cursor];
        if (!row) continue;
        cursors[i] = cursor + 1;
        out.push(row);
        progressed = true;
      }
    }
  };

  pull(perChannel);
  // Only dip back into a dominant channel when the mixed row is still tiny.
  if (out.length < Math.min(maxResults, 8)) pull(null);
  return out.map((row) => row.video);
}

export type RankForYouOptions = {
  /** Day key, or day key plus refresh epoch. Same key ⇒ same order. */
  rotationKey?: string;
  dismissedVideoIds?: readonly string[];
};

/** Rank, dedupe, and return video candidates for the feed. */
export function rankForYouCandidates(
  candidates: ForYouCandidate[],
  savedChannels: SavedChannel[],
  watchProgress: WatchProgressEntry[],
  limits: ForYouFeedLimits = DEFAULT_FOR_YOU_LIMITS,
  options: RankForYouOptions = {},
): VideoLikeForSummary[] {
  const progressByVideoId = new Map(
    watchProgress.map((entry) => [entry.videoId, entry]),
  );
  const historyChannelCounts = buildHistoryChannelCounts(watchProgress);
  const dismissedVideoIds = new Set(options.dismissedVideoIds ?? []);

  const bestByVideoId = new Map<string, ScoredVideo>();

  for (const candidate of candidates) {
    const id = candidate.video.id?.trim();
    if (!id) continue;

    const score = scoreCandidate(
      candidate,
      savedChannels,
      historyChannelCounts,
      progressByVideoId,
      dismissedVideoIds,
    );
    if (score < 0) continue;

    const row: ScoredVideo = {
      video: candidate.video,
      score,
      channelKey: channelKeyFor(candidate.video),
    };
    const cur = bestByVideoId.get(id);
    if (!cur || score > cur.score) bestByVideoId.set(id, row);
  }

  return interleaveByChannel(
    [...bestByVideoId.values()],
    limits.maxResults,
    options.rotationKey ?? "",
  );
}

/** True when the user has no signals to build a feed from. */
export function forYouHasLibrarySignals(
  savedChannels: SavedChannel[],
  watchProgress: WatchProgressEntry[],
  recentSearchQueries: string[],
): boolean {
  if (savedChannels.length > 0) return true;
  if (watchProgress.length > 0) return true;
  return recentSearchQueries.some((q) => q.trim().length > 0);
}
