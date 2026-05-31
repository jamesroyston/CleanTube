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

export async function upsertRecentSearch(
  supabase: SupabaseClient,
  userId: string,
  query: string,
) {
  const searchedAt = new Date().toISOString();
  const { data, error: updateError } = await supabase
    .from("recent_searches")
    .update({ searched_at: searchedAt })
    .eq("user_id", userId)
    .ilike("query", query)
    .select("id");
  if (updateError) throw updateError;
  if (data && data.length > 0) return;

  const { error: insertError } = await supabase.from("recent_searches").insert({
    user_id: userId,
    query,
    searched_at: searchedAt,
  });
  if (insertError) throw insertError;
}

export async function deleteRecentSearchByQuery(
  supabase: SupabaseClient,
  userId: string,
  query: string,
) {
  const { error } = await supabase
    .from("recent_searches")
    .delete()
    .eq("user_id", userId)
    .ilike("query", query);
  if (error) throw error;
}

export async function deleteAllRecentSearches(
  supabase: SupabaseClient,
  userId: string,
) {
  const { error } = await supabase
    .from("recent_searches")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export async function trimRecentSearchesToCap(
  supabase: SupabaseClient,
  userId: string,
  cap = 15,
) {
  const { data, error: fetchError } = await supabase
    .from("recent_searches")
    .select("id")
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
    .range(cap, 999_999);
  if (fetchError) throw fetchError;
  if (!data || data.length === 0) return;

  const { error: deleteError } = await supabase
    .from("recent_searches")
    .delete()
    .in(
      "id",
      data.map((row) => row.id),
    );
  if (deleteError) throw deleteError;
}
