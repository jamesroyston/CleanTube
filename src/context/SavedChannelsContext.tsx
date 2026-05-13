"use client";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import type {
  SavedChannel,
  SavedChannelEntryKind,
} from "@/types/savedChannel";

export type SavedChannelsContextValue = {
  channels: SavedChannel[];
  addChannel: (input: {
    name: string;
    channelId?: string;
    channelUrl?: string;
    thumbnailUrl?: string;
    searchQuery?: string;
    entryKind?: SavedChannelEntryKind;
  }) => void;
  updateChannel: (
    id: string,
    patch: Partial<Omit<SavedChannel, "id">>,
  ) => void;
  removeChannel: (id: string) => void;
};

export function useSavedChannels() {
  const library = useCloudLibrary();
  return {
    channels: library.savedChannels,
    addChannel: (input: {
      name: string;
      channelId?: string;
      channelUrl?: string;
      thumbnailUrl?: string;
      searchQuery?: string;
      entryKind?: SavedChannelEntryKind;
    }) => {
      void library.addSavedChannel(input);
    },
    updateChannel: (
      id: string,
      patch: Partial<Omit<SavedChannel, "id">>,
    ) => {
      void library.updateSavedChannel(id, patch);
    },
    removeChannel: (id: string) => {
      void library.removeSavedChannel(id);
    },
  };
}
