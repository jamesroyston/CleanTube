import { unstable_cache } from "next/cache";

import { getChannelDetails } from "@/lib/youtubeChannel";
import type { ChannelDetails } from "@/lib/youtubeTypes";

/** Shared CDN hint for anonymous channel metadata (matches `revalidate` below). */
export const CHANNEL_RESOLVE_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

export async function getChannelDetailsCached(
  lookup: string,
): Promise<ChannelDetails | null> {
  return unstable_cache(
    async () => getChannelDetails(lookup),
    ["cleantube-channel-resolve", lookup],
    { revalidate: 86400 },
  )();
}
