import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

const SERVICE_ROLE_HELP =
  "Set SUPABASE_SERVICE_ROLE_KEY to the service_role secret from Supabase Dashboard → Settings → API (same project as NEXT_PUBLIC_SUPABASE_URL). It must not be the anon or publishable key.";

function readJwtRole(secret: string): string | null {
  const parts = secret.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export type SupabaseServiceResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string };

/**
 * Service-role client for trusted server routes only. Never import in client components.
 */
export function resolveSupabaseServiceClient(): SupabaseServiceResult {
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!env.isConfigured) {
    return {
      ok: false,
      error: "Supabase URL or publishable key is not configured (NEXT_PUBLIC_SUPABASE_URL and a publishable key).",
    };
  }

  if (!serviceKey) {
    return { ok: false, error: `SUPABASE_SERVICE_ROLE_KEY is not set. ${SERVICE_ROLE_HELP}` };
  }

  const role = readJwtRole(serviceKey);
  if (role === "anon") {
    return {
      ok: false,
      error: `SUPABASE_SERVICE_ROLE_KEY looks like the anon (publishable) JWT. ${SERVICE_ROLE_HELP}`,
    };
  }

  return {
    ok: true,
    client: createClient(env.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function createSupabaseServiceClient(): SupabaseClient | null {
  const r = resolveSupabaseServiceClient();
  return r.ok ? r.client : null;
}

/** Maps common PostgREST / Auth errors to actionable copy for passkey and server routes. */
export function mapSupabaseUserFacingError(message: string): string {
  const m = message.trim();
  if (/invalid api key/i.test(m)) {
    return `Supabase rejected an API key (often the URL is for a different project than the key, or the service role secret was pasted incorrectly). ${SERVICE_ROLE_HELP}`;
  }
  return m;
}
