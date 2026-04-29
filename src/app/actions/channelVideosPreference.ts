"use server";

import { cookies } from "next/headers";

import {
  CHANNEL_VIDEOS_COOKIE,
  type ChannelVideosVariant,
} from "@/lib/channelVideosPreferenceConstants";

export async function setChannelVideosVariantAction(
  variant: ChannelVideosVariant,
): Promise<void> {
  const jar = await cookies();
  jar.set(CHANNEL_VIDEOS_COOKIE, variant, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
