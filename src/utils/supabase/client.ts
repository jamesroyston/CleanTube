import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { supabaseCookieOptions } from "@/utils/supabase/cookieOptions";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env.isConfigured) return null;
  const { url, publishableKey } = env;
  if (!browserClient) {
    browserClient = createBrowserClient(url, publishableKey, {
      cookieOptions: supabaseCookieOptions,
    });
  }
  return browserClient;
}
