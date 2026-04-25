"use client";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import type { SavedChannel } from "@/types/savedChannel";

export type SavedChannelsContextValue = {
  channels: SavedChannel[];
  addChannel: (input: {
    name: string;
    channelId?: string;
    channelUrl?: string;
    searchQuery?: string;
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
      searchQuery?: string;
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
