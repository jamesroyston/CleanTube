import type { CookieOptionsWithName } from "@supabase/ssr";

/** Shared auth cookie defaults for browser + server Supabase clients. */
export const supabaseCookieOptions: CookieOptionsWithName = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
