export type VideoSummary = {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  durationFormatted: string;
  uploadedAt?: string;
  live: boolean;
};
