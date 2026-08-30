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
  maxHistorySeeds: number;
  maxVideosPerChannel: number;
  maxVideosPerSearch: number;
  maxVideosPerWatchNext: number;
  maxResults: number;
};

export const DEFAULT_FOR_YOU_LIMITS: ForYouFeedLimits = {
  maxSavedChannels: 6,
  maxHistorySeeds: 4,
  maxVideosPerChannel: 8,
  maxVideosPerSearch: 10,
  maxVideosPerWatchNext: 6,
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
  /** UTC day key the feed was generated for; lets the client surface a
   * non-destructive "fresh recommendations" prompt once it rolls over. */
  generatedDayKey?: string;
};
