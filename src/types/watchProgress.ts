export type WatchProgressEntry = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  lastPositionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
  /** True once the user has finished this video; stays set during rewatch. */
  everCompleted?: boolean;
  lastWatchedAt: string;
  updatedAt: string;
};
