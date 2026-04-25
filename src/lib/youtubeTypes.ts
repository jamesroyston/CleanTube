/**
 * Minimal video shape for search/grid serialization (youtubei.js feed entries, etc.).
 */
export type VideoLikeForSummary = {
  id: string;
  title?: string;
  channelName?: string;
  durationFormatted: string;
  uploadedAt?: string;
  live: boolean;
  /** Best-effort ordered URLs from the API (plus canonicalized). */
  thumbnailUrls: string[];
};

export type ChannelSortMode = "latest" | "popular";

export type ChannelDetails = {
  id: string;
  title: string;
  handle?: string;
  description?: string;
  channelUrl: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  subscriberText?: string;
  videoCountText?: string;
  viewCountText?: string;
  joinedDateText?: string;
  source: "youtubei.js";
};

export type ChannelVideosPage = {
  channel: ChannelDetails;
  videos: VideoLikeForSummary[];
  sort: ChannelSortMode;
  pageToken?: string;
  nextPageToken?: string;
  previousPageToken?: string;
  totalPages?: number;
};

export type ChannelSearchResult = {
  id: string;
  title: string;
  handle?: string;
  description?: string;
  channelUrl: string;
  thumbnailUrl?: string;
  subscriberText?: string;
  videoCountText?: string;
};

export type MixedSearchResults = {
  channels: ChannelSearchResult[];
  videos: VideoLikeForSummary[];
};

export type WatchVideoDetails = {
  id: string;
  title: string;
  channelName: string;
  channelId?: string;
  channelUrl?: string;
  uploadedAt?: string;
  views: number;
  description?: string;
  thumbnailUrl?: string;
  source: "youtubei.js" | "watch-html" | "oembed";
};
