import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextRaw = requestUrl.searchParams.get("next") ?? "/";
  const nextPath =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const oauthError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(oauthError)}`, request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
