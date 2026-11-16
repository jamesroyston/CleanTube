import type { VideoSummary } from "@/components/VideoSummary";
import type { VideoLikeForSummary } from "@/lib/youtubeTypes";

export type ForYouCandidateSource =
  | "saved_channel"
  | "pinned_search"
  | "watch_next"
  | "recent_search";

export type ForYouCandidate = {
  video: VideoLikeForSummary;
  source: ForYouCandidateSource;
  /** Optional channel name from the seed (saved channel title or history). */
  seedChannelName?: string;
  /** Recent search query that produced this candidate. */
  seedSearchQuery?: string;
  /** History seed video id (watch_next sections only). */
  seedVideoId?: string;
  /** History seed title for section headings. */
  seedHistoryTitle?: string;
};

export type ForYouFeedLimits = {
  maxSavedChannels: number;
  maxPinnedSearches: number;
  maxHistorySeeds: number;
  maxVideosPerChannel: number;
  maxVideosPerSearch: number;
  maxVideosPerWatchNext: number;
  maxResults: number;
};

export const DEFAULT_FOR_YOU_LIMITS: ForYouFeedLimits = {
  maxSavedChannels: 10,
  maxPinnedSearches: 6,
  maxHistorySeeds: 6,
  maxVideosPerChannel: 12,
  maxVideosPerSearch: 12,
  maxVideosPerWatchNext: 8,
  maxResults: 48,
};

export type ForYouSection = {
  id: string;
  title: string;
  videos: VideoSummary[];
  /** Present on recent-search carousels so the heading menu can mute that query. */
  seedSearchQuery?: string;
};

export type ForYouFeedResult = {
  sections: ForYouSection[];
  empty: boolean;
  /** UTC day the feed was built for. */
  generatedDayKey?: string;
};
