"use client";

import type { VideoSummary } from "@/components/VideoSummary";
import { VideoCarouselRow } from "@/components/VideoCarouselRow";
import type { WatchProgressEntry } from "@/types/watchProgress";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";
import { formatYoutubeDurationSeconds } from "@/lib/youtubeiAdapters";

type ContinueWatchingRowProps = {
  entries: WatchProgressEntry[];
};

function entriesToVideoSummaries(entries: WatchProgressEntry[]): VideoSummary[] {
  return entries.map((entry) => ({
    id: entry.videoId,
    title: entry.title,
    thumbnailUrl: entry.thumbnailUrl,
    thumbnailFallbackUrls: youtubeThumbnailFallbackUrls(
      entry.videoId,
      undefined,
      entry.thumbnailUrl,
    ),
    channelName: entry.channelName,
    durationFormatted:
      formatYoutubeDurationSeconds(entry.durationSeconds) || "—",
    live: false,
  }));
}

export function ContinueWatchingRow({ entries }: ContinueWatchingRowProps) {
  const videos = entriesToVideoSummaries(entries);

  return (
    <VideoCarouselRow videos={videos} ariaLabel="Continue watching" />
  );
}
