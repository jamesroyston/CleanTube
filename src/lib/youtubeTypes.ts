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
