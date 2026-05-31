import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { supabaseCookieOptions } from "@/utils/supabase/cookieOptions";
import { hasSupabaseAuthCookies } from "@/utils/supabase/hasAuthCookies";

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env.isConfigured) {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = env;

  if (!hasSupabaseAuthCookies(request, url)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
