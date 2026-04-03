export type SavedChannel = {
  id: string;
  name: string;
  channelId?: string;
  channelUrl?: string;
  /** Passed to site search (`/?q=`) */
  searchQuery: string;
};
