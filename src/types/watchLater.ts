export type WatchLaterEntry = {
  entryId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  /** Saved start offset when the user queued a timestamped video */
  startSeconds?: number;
  addedAt: string;
};
