import { YTNodes } from "youtubei.js";

import { lockupViewShortToVideoLike } from "@/lib/youtubeiAdapters";
import { getInnertube } from "@/lib/youtubeiClient";
import type { VideoLikeForSummary } from "@/lib/youtubeTypes";

type FeedLike = {
  videos?: unknown[];
  has_continuation?: boolean;
  getContinuation?: () => Promise<FeedLike>;
  memo?: { getType?: (...classes: unknown[]) => unknown[] };
};

type ChannelLike = {
  getShorts?: () => Promise<FeedLike>;
};

function withChannelName(
  item: VideoLikeForSummary,
  channelName: string | undefined,
): VideoLikeForSummary {
  const current = item.channelName?.trim();
  if (current && current !== "Unknown channel") return item;
  if (!channelName?.trim()) return item;
  return { ...item, channelName: channelName.trim() };
}

function listShortLockups(feed: FeedLike): unknown[] {
  const memo = feed.memo;
  if (!memo || typeof memo.getType !== "function") return [];
  try {
    const lockups = memo.getType(YTNodes.LockupView) as { content_type?: string }[];
    return lockups.filter((lv) => lv.content_type === "SHORT");
  } catch {
    return [];
  }
}

function shortItemsFromFeed(feed: FeedLike): unknown[] {
  const feedVideos = feed.videos ?? [];
  if (feedVideos.length > 0) return feedVideos;
  return listShortLockups(feed);
}

function feedItemToShortVideo(item: unknown): VideoLikeForSummary | null {
  const fromLockup = lockupViewShortToVideoLike(item);
  if (fromLockup) return fromLockup;
  return null;
}

export async function getChannelShorts(input: {
  channelId: string;
  limit: number;
  channelName?: string;
}): Promise<VideoLikeForSummary[]> {
  const yt = (await getInnertube()) as { getChannel: (id: string) => Promise<unknown> };
  const channel = (await yt.getChannel(input.channelId)) as ChannelLike;
  if (typeof channel.getShorts !== "function") return [];

  let feed: FeedLike;
  try {
    feed = await channel.getShorts();
  } catch {
    return [];
  }

  const out: VideoLikeForSummary[] = [];
  const seen = new Set<string>();
  let current: FeedLike | null = feed;
  let continuationSteps = 0;

  while (current && out.length < input.limit) {
    for (const item of shortItemsFromFeed(current)) {
      const mapped = feedItemToShortVideo(item);
      if (!mapped || seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      out.push(withChannelName(mapped, input.channelName));
      if (out.length >= input.limit) break;
    }
    if (out.length >= input.limit) break;
    if (!current.has_continuation || typeof current.getContinuation !== "function") {
      break;
    }
    if (continuationSteps >= 2) break;
    continuationSteps += 1;
    try {
      current = await current.getContinuation();
    } catch {
      break;
    }
  }

  return out;
}
