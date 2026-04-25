export type SupabaseEnv =
  | { isConfigured: false; url: null; publishableKey: null }
  | { isConfigured: true; url: string; publishableKey: string };

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return { url: null, publishableKey: null, isConfigured: false };
  }

  return {
    url,
    publishableKey,
    isConfigured: true,
  };
}
