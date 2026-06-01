export type VideoSummary = {
  id: string;
  title: string;
  kind?: "video" | "short";
  thumbnailUrl: string;
  /** Extra URLs when the primary `thumbnailUrl` 404s (e.g. try API thumb, then other ytimg sizes). */
  thumbnailFallbackUrls?: string[];
  channelName: string;
  durationFormatted: string;
  uploadedAt?: string;
  live: boolean;
};
