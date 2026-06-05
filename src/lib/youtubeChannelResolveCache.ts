import { cacheLife, cacheTag } from "next/cache";

import { getChannelDetails } from "@/lib/youtubeChannel";
import type { ChannelDetails } from "@/lib/youtubeTypes";

/** Shared CDN hint for anonymous channel metadata (matches `revalidate` below). */
export const CHANNEL_RESOLVE_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

async function getChannelDetailsCachedInner(
  lookup: string,
): Promise<ChannelDetails | null> {
  "use cache";
  cacheTag("cleantube-channel-resolve", lookup);
  cacheLife({ revalidate: 86400 });
  return getChannelDetails(lookup);
}

export async function getChannelDetailsCached(
  lookup: string,
): Promise<ChannelDetails | null> {
  return getChannelDetailsCachedInner(lookup);
}
