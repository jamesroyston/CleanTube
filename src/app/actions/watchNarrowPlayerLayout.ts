"use server";

import { cookies } from "next/headers";

import { WATCH_NARROW_PLAYER_LAYOUT_COOKIE } from "@/lib/watchNarrowPlayerLayoutPersistence";

export async function setWatchNarrowPlayerLayoutAction(
  enabled: boolean,
): Promise<void> {
  const jar = await cookies();
  jar.set(WATCH_NARROW_PLAYER_LAYOUT_COOKIE, enabled ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
