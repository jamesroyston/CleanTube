import {
  fetchYouTubeOEmbed,
  parseChannelIdFromYoutubeUrl,
} from "@/lib/oembed";
import { preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import { videoInfoToWatchDetails } from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

export type { WatchVideoDetails } from "@/lib/youtubeTypes";

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
  if (!id || !isValidYoutubeVideoId(id)) return null;

  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(id);
    return videoInfoToWatchDetails(info, id);
  } catch {
    /* fall through to oEmbed */
  }

  const oembed = await fetchYouTubeOEmbed(id);
  return fromOEmbed(id, oembed);
}
