import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase browser session in a Route Handler (sets auth cookies on verify/sign-in).
 */
export async function createSupabaseRouteHandlerClient() {
  const env = getSupabaseEnv();
  if (!env.isConfigured) return null;
  const { url, publishableKey } = env;
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
