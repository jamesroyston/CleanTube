export type SavedChannelEntryKind = "saved_channel" | "pinned_search";

export type SavedChannel = {
  id: string;
  name: string;
  channelId?: string;
  channelUrl?: string;
  /** Channel avatar / thumbnail when saved from a channel page */
  thumbnailUrl?: string;
  /** Passed to site search (`/?q=`) */
  searchQuery: string;
  /**
   * Authoritative separation of saved channels vs pinned searches.
   * When absent (legacy local JSON), callers should use {@link effectiveSavedChannelKind}.
   */
  entryKind?: SavedChannelEntryKind;
};

export function effectiveSavedChannelKind(
  channel: Pick<
    SavedChannel,
    "entryKind" | "channelId" | "channelUrl" | "thumbnailUrl"
  >,
): SavedChannelEntryKind {
  if (channel.entryKind === "pinned_search") return "pinned_search";
  if (channel.entryKind === "saved_channel") return "saved_channel";
  const hasHints =
    Boolean(channel.channelId?.trim()) ||
    Boolean(channel.channelUrl?.trim()) ||
    Boolean(channel.thumbnailUrl?.trim());
  return hasHints ? "saved_channel" : "pinned_search";
}
