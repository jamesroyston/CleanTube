"use server";

import { cookies } from "next/headers";

import { WATCH_COMMENTS_VISIBLE_COOKIE } from "@/lib/watchCommentsVisibilityPersistence";

export async function setWatchCommentsVisibleAction(visible: boolean): Promise<void> {
  const jar = await cookies();
  jar.set(WATCH_COMMENTS_VISIBLE_COOKIE, visible ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
