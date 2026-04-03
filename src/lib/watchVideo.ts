import type { Video } from "youtube-sr";
import YouTube from "youtube-sr";

import {
  fetchYouTubeOEmbed,
  parseChannelIdFromYoutubeUrl,
} from "@/lib/oembed";
import { preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import { YOUTUBE_FETCH_INIT } from "@/lib/youtubeRequest";

export type WatchVideoDetails = {
  id: string;
  title: string;
  channelName: string;
  channelId?: string;
  channelUrl?: string;
  uploadedAt?: string;
  views: number;
  description?: string;
  thumbnailUrl?: string;
  source: "youtube-sr" | "oembed";
};

function fromYoutubeSr(video: Video, id: string): WatchVideoDetails {
  return {
    id,
    title: video.title ?? "Video",
    channelName: video.channel?.name ?? "Unknown channel",
    channelId: video.channel?.id,
    channelUrl: video.channel?.url,
    uploadedAt: video.uploadedAt,
    views: video.views ?? 0,
    description: video.description,
    thumbnailUrl: preferredYoutubeThumbnailPath(id, video),
    source: "youtube-sr",
  };
}

function fromOEmbed(
  id: string,
  o: Awaited<ReturnType<typeof fetchYouTubeOEmbed>>,
): WatchVideoDetails | null {
  if (!o) return null;
  const channelUrl = o.author_url || undefined;
  return {
    id,
    title: o.title,
    channelName: o.author_name || "Unknown channel",
    channelId: channelUrl
      ? parseChannelIdFromYoutubeUrl(channelUrl)
      : undefined,
    channelUrl,
    uploadedAt: undefined,
    views: 0,
    description: undefined,
    thumbnailUrl: preferredYoutubeThumbnailPath(id),
    source: "oembed",
  };
}

export async function getWatchVideoDetails(
  id: string,
): Promise<WatchVideoDetails | null> {
  if (!id || !YouTube.validate(id, "VIDEO_ID")) return null;

  try {
    const video = await YouTube.getVideo(
      `https://www.youtube.com/watch?v=${id}`,
      YOUTUBE_FETCH_INIT,
    );
    if (video) return fromYoutubeSr(video, id);
  } catch {
    /* fall through to oEmbed */
  }

  const oembed = await fetchYouTubeOEmbed(id);
  return fromOEmbed(id, oembed);
}
