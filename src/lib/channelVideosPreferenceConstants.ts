export const CHANNEL_VIDEOS_COOKIE = "cleantube_channel_videos";

export type ChannelVideosVariant = "legacy" | "v2";

export function normalizeChannelVideosVariant(
  value: string | undefined,
): ChannelVideosVariant {
  if (!value) return "legacy";
  const v = value.trim().toLowerCase();
  if (v === "v2" || v === "robust" || v === "robust-v2") return "v2";
  return "legacy";
}
