import { cache } from "react";
import type { YT } from "youtubei.js";

import { getInnertube } from "@/lib/youtubeiClient";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

async function loadInnertubeVideoInfo(
  id: string,
): Promise<YT.VideoInfo | null> {
  if (!id || !isValidYoutubeVideoId(id)) return null;
  try {
    const yt = await getInnertube();
    return await yt.getInfo(id);
  } catch {
    return null;
  }
}

/**
 * One `getInfo` per video id per React server request (RSC / SSR).
 * Used by watch metadata and watch-next rail so they do not duplicate InnerTube work.
 */
export const getCachedInnertubeVideoInfo = cache(loadInnertubeVideoInfo);
