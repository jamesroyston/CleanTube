import { unstable_cache } from "next/cache";

import { getChannelDetails } from "@/lib/youtubeChannel";
import type { ChannelDetails } from "@/lib/youtubeTypes";

/** Shared CDN hint for anonymous channel metadata (matches `revalidate` below). */
export const CHANNEL_RESOLVE_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

export const getChannelDetailsCached = unstable_cache(
  async (lookup: string): Promise<ChannelDetails | null> => getChannelDetails(lookup),
  ["cleantube-channel-resolve"],
  { revalidate: 86400 },
);
