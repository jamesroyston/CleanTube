"use client";

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

export async function fetchCloudRecentSearches(
  supabase: SupabaseClient,
): Promise<RecentSearchEntry[]> {
  const { data, error } = await supabase
    .from("recent_searches")
    .select("id, user_id, query, searched_at")
    .order("searched_at", { ascending: false });

  if (error) throw error;
  return (data as RecentSearchRow[]).map(toRecentSearchEntry);
}

export async function replaceRecentSearches(
  supabase: SupabaseClient,
  userId: string,
  entries: RecentSearchEntry[],
) {
  const { error: deleteError } = await supabase
    .from("recent_searches")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (entries.length === 0) return;

  const rows = entries.map((entry) => ({
    user_id: userId,
    query: entry.query,
    searched_at: entry.searchedAt,
  }));
  const { error } = await supabase.from("recent_searches").insert(rows);
  if (error) throw error;
}
