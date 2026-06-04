"use server";

import { cookies } from "next/headers";

import {
  COMPACT_LAYOUT_HINT_COOKIE,
  compactLayoutHintToCookieValue,
  type CompactLayoutHint,
} from "@/lib/compactLayoutHint";

export async function setCompactLayoutHintAction(
  hint: CompactLayoutHint,
): Promise<void> {
  const jar = await cookies();
  jar.set(COMPACT_LAYOUT_HINT_COOKIE, compactLayoutHintToCookieValue(hint), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
