"use client";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import type { WatchLaterEntry } from "@/types/watchLater";

export type WatchLaterContextValue = {
  entries: WatchLaterEntry[];
  addOrUpdateEntry: (input: {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    channelName: string;
    startSeconds?: number;
  }) => void;
  removeByVideoId: (videoId: string) => void;
  isInWatchLater: (videoId: string) => boolean;
};

export function useWatchLater() {
  const library = useCloudLibrary();
  return {
    entries: library.watchLaterEntries,
    addOrUpdateEntry: (input: {
      videoId: string;
      title: string;
      thumbnailUrl: string;
      channelName: string;
      startSeconds?: number;
    }) => {
      void library.addOrUpdateWatchLater(input);
    },
    removeByVideoId: (videoId: string) => {
      void library.removeWatchLaterByVideoId(videoId);
    },
    isInWatchLater: library.isInWatchLater,
  };
}
