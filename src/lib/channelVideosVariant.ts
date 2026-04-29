import { cookies } from "next/headers";

import {
  CHANNEL_VIDEOS_COOKIE,
  normalizeChannelVideosVariant,
  type ChannelVideosVariant,
} from "@/lib/channelVideosPreferenceConstants";

export type ChannelVideosCookieStore = Awaited<ReturnType<typeof cookies>>;

export { CHANNEL_VIDEOS_COOKIE, normalizeChannelVideosVariant };
export type { ChannelVideosVariant };

/**
 * Resolves which channel grid backend to use. Precedence:
 * CHANNEL_VIDEOS_FORCE_VARIANT → ?grid= → cookie → CHANNEL_VIDEOS_DEFAULT_VARIANT → legacy.
 */
export function resolveChannelVideosVariant(
  cookieStore: ChannelVideosCookieStore,
  searchParams?: { grid?: string | string[] | null | undefined },
): ChannelVideosVariant {
  const forced = process.env.CHANNEL_VIDEOS_FORCE_VARIANT?.trim().toLowerCase();
  if (forced === "v2" || forced === "legacy") {
    return forced === "v2" ? "v2" : "legacy";
  }

  const rawGrid = searchParams?.grid;
  const grid =
    typeof rawGrid === "string"
      ? rawGrid
      : Array.isArray(rawGrid)
        ? rawGrid[0]
        : undefined;
  const g = grid?.trim().toLowerCase();
  if (g === "v2" || g === "robust" || g === "robust-v2") return "v2";
  if (g === "legacy" || g === "stable") return "legacy";

  const cookieVal = cookieStore.get(CHANNEL_VIDEOS_COOKIE)?.value;
  if (cookieVal) return normalizeChannelVideosVariant(cookieVal);

  const defaultVariant = process.env.CHANNEL_VIDEOS_DEFAULT_VARIANT?.trim().toLowerCase();
  if (defaultVariant === "v2") return "v2";
  return "legacy";
}
