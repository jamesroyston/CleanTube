import { getLastSearchSort } from "@/lib/lastSearchSession";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
} from "@/lib/youtubeUrl";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { SavedChannel } from "@/types/savedChannel";

function searchHref(q: string): string {
  const searchSort = getLastSearchSort();
  const qs = new URLSearchParams();
  qs.set("q", q);
  if (searchSort !== "relevance") qs.set("searchSort", searchSort);
  return `/?${qs.toString()}`;
}

/** In-app href for a saved library entry (never a raw youtube.com URL). */
export function savedChannelBrowseHref(channel: SavedChannel): string {
  const kind = effectiveSavedChannelKind(channel);
  if (kind === "pinned_search") {
    return searchHref(channel.searchQuery);
  }
  if (channel.channelId) {
    return channelPageHrefFromToken(channel.channelId);
  }
  const url = channel.channelUrl?.trim();
  if (url) {
    const token = extractChannelRouteTokenFromUrl(url);
    if (token) return channelPageHrefFromToken(token);
  }
  return searchHref(channel.searchQuery);
}
