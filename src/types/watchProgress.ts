export type WatchProgressEntry = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  lastPositionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
  lastWatchedAt: string;
  updatedAt: string;
};
