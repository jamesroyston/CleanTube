import { cookies } from "next/headers";

import { fetchCloudSnapshotServer } from "@/lib/cloudLibrary/serverSnapshot";
import { fetchCloudRecentSearchesServer } from "@/lib/cloudRecentSearches/serverStore";
import { entriesToQueryList } from "@/lib/cloudRecentSearches/sync";
import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";
import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { hasSupabaseAuthCookiesFromList } from "@/utils/supabase/hasAuthCookies";

export type ForYouLibrarySignals = {
  userId: string;
  snapshot: CloudSnapshot;
  recentSearches: RecentSearchEntry[];
  recentSearchQueries: string[];
};

/** Auth-only check for home shell (avoids library snapshot reads on SSR). */
export async function forYouSignedIn(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  return !userError && user != null;
}

async function resolveAuthenticatedUser(supabase: NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>) {
  let {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!userError && user) return user;

  const env = getSupabaseEnv();
  if (!env.isConfigured) return null;

  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookiesFromList(cookieStore.getAll(), env.url)) {
    return null;
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return null;

  ({
    data: { user },
    error: userError,
  } = await supabase.auth.getUser());

  if (userError || !user) return null;
  return user;
}

export async function loadForYouLibrarySignals(): Promise<ForYouLibrarySignals | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const user = await resolveAuthenticatedUser(supabase);
  if (!user) return null;

  const [snapshot, recentSearches] = await Promise.all([
    fetchCloudSnapshotServer(supabase),
    fetchCloudRecentSearchesServer(supabase),
  ]);

  return {
    userId: user.id,
    snapshot,
    recentSearches,
    recentSearchQueries: entriesToQueryList(recentSearches),
  };
}
