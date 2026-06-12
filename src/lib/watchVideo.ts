import { cache } from "react";

import {
  fetchYouTubeOEmbed,
  parseChannelIdFromYoutubeUrl,
} from "@/lib/oembed";
import { preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import { getCachedInnertubeVideoInfo } from "@/lib/innertubeVideoInfoCache";
import {
  getVideoDetailsViaDataApi,
  isYoutubeDataApiEnabled,
} from "@/lib/youtubeDataApi";
import { videoInfoToWatchDetails } from "@/lib/youtubeiAdapters";
import type { WatchVideoDetails } from "@/lib/youtubeTypes";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

export type { WatchVideoDetails } from "@/lib/youtubeTypes";

const FALLBACK_TITLE = "Video";
const FALLBACK_CHANNEL = "Unknown channel";

function hasUsableWatchMetadata(video: WatchVideoDetails): boolean {
  return (
    video.title.trim() !== FALLBACK_TITLE &&
    video.channelName.trim() !== FALLBACK_CHANNEL
  );
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

function isWatchMetadataComplete(video: WatchVideoDetails): boolean {
  return (
    Boolean(video.description?.trim()) &&
    video.views > 0 &&
    Boolean(video.uploadedAt?.trim()) &&
    Boolean(video.channelThumbnailUrl?.trim())
  );
}

/** Primary fields win; gaps are filled from the secondary source. */
function mergeWatchDetails(
  primary: WatchVideoDetails,
  secondary: WatchVideoDetails | null,
): WatchVideoDetails {
  if (!secondary) return primary;
  return {
    ...primary,
    title:
      primary.title.trim() && primary.title.trim() !== FALLBACK_TITLE
        ? primary.title
        : secondary.title,
    channelName:
      primary.channelName.trim() &&
      primary.channelName.trim() !== FALLBACK_CHANNEL
        ? primary.channelName
        : secondary.channelName,
    channelId: primary.channelId ?? secondary.channelId,
    channelUrl: primary.channelUrl ?? secondary.channelUrl,
    channelThumbnailUrl:
      primary.channelThumbnailUrl ?? secondary.channelThumbnailUrl,
    uploadedAt: primary.uploadedAt ?? secondary.uploadedAt,
    views: primary.views > 0 ? primary.views : secondary.views,
    description: primary.description?.trim()
      ? primary.description
      : secondary.description,
    thumbnailUrl: primary.thumbnailUrl ?? secondary.thumbnailUrl,
  };
}

/**
 * Backfill any fields InnerTube omitted using the official Data API.
 * InnerTube `getInfo` is bot-challenged from datacenter IPs (Vercel), so this is what
 * keeps description / views / date / channel avatar populated in production. Inert when
 * no Data API key is configured (e.g. localhost keeps its InnerTube-only behavior).
 */
async function backfillWatchFromDataApi(
  id: string,
  video: WatchVideoDetails,
): Promise<WatchVideoDetails> {
  if (!isYoutubeDataApiEnabled() || isWatchMetadataComplete(video)) {
    return video;
  }
  const fromApi = await getVideoDetailsViaDataApi(id);
  return mergeWatchDetails(video, fromApi);
}

/**
 * Metadata sources, in order: InnerTube (`youtubei.js`) → official Data API → oEmbed.
 * There is intentionally no HTML scrape: it is CPU-heavy (full watch-page fetch + balanced
 * JSON scan) and reliably fails from datacenter IPs, so the Data API replaces it.
 */
async function loadWatchVideoDetails(
  id: string,
): Promise<WatchVideoDetails | null> {
  if (!id || !isValidYoutubeVideoId(id)) return null;

  let fallbackVideo: WatchVideoDetails | null = null;

  const info = await getCachedInnertubeVideoInfo(id);
  if (info) {
    try {
      const video = videoInfoToWatchDetails(info, id);
      if (hasUsableWatchMetadata(video)) {
        return await backfillWatchFromDataApi(id, video);
      }
      fallbackVideo = video;
    } catch {
      /* fall through to Data API / oEmbed fallbacks */
    }
  }

  // Reliable datacenter fallback when InnerTube is blocked (e.g. Vercel).
  const fromDataApi = await getVideoDetailsViaDataApi(id);
  if (fromDataApi && hasUsableWatchMetadata(fromDataApi)) {
    return mergeWatchDetails(fromDataApi, fallbackVideo);
  }

  // oEmbed only carries title + channel name; merge in any usable fields the partial
  // InnerTube result already pulled from `/next` (description / date / views / avatar)
  // so we never discard data we successfully fetched.
  const oembed = await fetchYouTubeOEmbed(id);
  const oembedVideo = fromOEmbed(id, oembed);
  const base = oembedVideo
    ? mergeWatchDetails(oembedVideo, fallbackVideo)
    : fallbackVideo;
  return base ? await backfillWatchFromDataApi(id, base) : base;
}

/** Dedupes InnerTube/Data API work within a single RSC request (e.g. `generateMetadata` + page). */
export const getWatchVideoDetails = cache(loadWatchVideoDetails);
