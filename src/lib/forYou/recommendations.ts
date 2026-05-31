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
): number {
  const video = candidate.video;
  const progress = progressByVideoId.get(video.id);
  if (isCompletedProgress(progress)) return -1;

  let score = SOURCE_WEIGHT[candidate.source] ?? 0;
  score += channelAffinityBoost(
    video.channelName ?? candidate.seedChannelName ?? "",
    savedChannels,
    historyChannelCounts,
  );
  score += uploadRecencyBoost(video.uploadedAt);

  if (progress && !progress.completed && progress.lastPositionSeconds > 0) {
    score -= 4;
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

/** Rank, dedupe, and return video candidates for the feed. */
export function rankForYouCandidates(
  candidates: ForYouCandidate[],
  savedChannels: SavedChannel[],
  watchProgress: WatchProgressEntry[],
  limits: ForYouFeedLimits = DEFAULT_FOR_YOU_LIMITS,
): VideoLikeForSummary[] {
  const progressByVideoId = new Map(
    watchProgress.map((entry) => [entry.videoId, entry]),
  );
  const historyChannelCounts = buildHistoryChannelCounts(watchProgress);

  const bestByVideoId = new Map<
    string,
    { video: VideoLikeForSummary; score: number }
  >();

  for (const candidate of candidates) {
    const id = candidate.video.id?.trim();
    if (!id) continue;

    const score = scoreCandidate(
      candidate,
      savedChannels,
      historyChannelCounts,
      progressByVideoId,
    );
    if (score < 0) continue;

    const cur = bestByVideoId.get(id);
    if (!cur || score > cur.score) {
      bestByVideoId.set(id, { video: candidate.video, score });
    }
  }

  return Array.from(bestByVideoId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.maxResults)
    .map((row) => row.video);
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
