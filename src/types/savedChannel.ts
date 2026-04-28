export type SavedChannel = {
  id: string;
  name: string;
  channelId?: string;
  channelUrl?: string;
  /** Channel avatar / thumbnail when saved from a channel page */
  thumbnailUrl?: string;
  /** Passed to site search (`/?q=`) */
  searchQuery: string;
};
