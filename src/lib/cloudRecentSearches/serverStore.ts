import type { SupabaseClient } from "@supabase/supabase-js";

import type { RecentSearchEntry } from "@/lib/cloudRecentSearches/types";

type RecentSearchRow = {
  id: string;
  user_id: string;
  query: string;
  searched_at: string;
};

function toRecentSearchEntry(row: RecentSearchRow): RecentSearchEntry {
  return {
    query: row.query,
    searchedAt: row.searched_at,
  };
}

/** Server-safe recent searches fetch (no `"use client"` module). */
export async function fetchCloudRecentSearchesServer(
  supabase: SupabaseClient,
): Promise<RecentSearchEntry[]> {
  const { data, error } = await supabase
    .from("recent_searches")
    .select("id, user_id, query, searched_at")
    .order("searched_at", { ascending: false });

  if (error) throw error;
  return (data as RecentSearchRow[]).map(toRecentSearchEntry);
}
