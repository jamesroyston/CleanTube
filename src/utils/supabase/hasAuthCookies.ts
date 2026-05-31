import type { NextRequest } from "next/server";

/** Project ref from `https://<ref>.supabase.co`. */
export function supabaseProjectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0]?.trim();
    return ref || null;
  } catch {
    return null;
  }
}

/** True when the request may carry a Supabase session (skip getUser when false). */
export function hasSupabaseAuthCookies(
  request: NextRequest,
  supabaseUrl: string,
): boolean {
  const ref = supabaseProjectRefFromUrl(supabaseUrl);
  const prefix = ref ? `sb-${ref}-` : "sb-";

  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    if (!name.startsWith(prefix)) return false;
    return (
      name.includes("auth-token") ||
      name.includes("auth-code-verifier") ||
      name.includes("auth-code")
    );
  });
}
