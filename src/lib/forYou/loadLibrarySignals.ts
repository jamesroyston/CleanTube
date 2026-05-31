import { fetchCloudSnapshotServer } from "@/lib/cloudLibrary/serverSnapshot";
import { fetchCloudRecentSearchesServer } from "@/lib/cloudRecentSearches/serverStore";
import { entriesToQueryList } from "@/lib/cloudRecentSearches/sync";
import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";
import type { CloudSnapshot } from "@/lib/cloudLibrary/cloudStore";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type ForYouLibrarySignals = {
  snapshot: CloudSnapshot;
  recentSearches: RecentSearchEntry[];
  recentSearchQueries: string[];
};

export async function loadForYouLibrarySignals(): Promise<ForYouLibrarySignals | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const [snapshot, recentSearches] = await Promise.all([
    fetchCloudSnapshotServer(supabase),
    fetchCloudRecentSearchesServer(supabase),
  ]);

  return {
    snapshot,
    recentSearches,
    recentSearchQueries: entriesToQueryList(recentSearches),
  };
}
