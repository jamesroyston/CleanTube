"use server";

import { cookies } from "next/headers";

import {
  LIBRARY_SIDEBAR_COLLAPSED_COOKIE,
  librarySidebarCollapsedToStorageValue,
} from "@/lib/librarySidebarPersistence";

export async function setLibrarySidebarCollapsedAction(
  collapsed: boolean,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    LIBRARY_SIDEBAR_COLLAPSED_COOKIE,
    librarySidebarCollapsedToStorageValue(collapsed),
    {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}
