import type { SupabaseClient } from "@supabase/supabase-js";

import type { ForYouMutedSearchEntry } from "./types";
import {
  FOR_YOU_MUTED_SEARCHES_MAX_ITEMS,
  normalizeForYouSearchQuery,
} from "./types";

type MutedSearchRow = {
  id: string;
  user_id: string;
  query_key: string;
  muted_at: string;
};

function toMutedEntry(row: MutedSearchRow): ForYouMutedSearchEntry {
  return {
    queryKey: row.query_key,
    mutedAt: row.muted_at,
  };
}

export async function fetchForYouMutedSearches(
  supabase: SupabaseClient,
): Promise<ForYouMutedSearchEntry[]> {
  const { data, error } = await supabase
    .from("for_you_muted_searches")
    .select("id, user_id, query_key, muted_at")
    .order("muted_at", { ascending: false })
    .limit(FOR_YOU_MUTED_SEARCHES_MAX_ITEMS);

  if (error) throw error;
  return (data as MutedSearchRow[]).map(toMutedEntry);
}

export async function upsertForYouMutedSearch(
  supabase: SupabaseClient,
  userId: string,
  query: string,
) {
  const queryKey = normalizeForYouSearchQuery(query);
  if (!queryKey) return;

  const mutedAt = new Date().toISOString();
  const { data, error: updateError } = await supabase
    .from("for_you_muted_searches")
    .update({ muted_at: mutedAt })
    .eq("user_id", userId)
    .eq("query_key", queryKey)
    .select("id");
  if (updateError) throw updateError;
  if (data && data.length > 0) return;

  const { error: insertError } = await supabase
    .from("for_you_muted_searches")
    .insert({
      user_id: userId,
      query_key: queryKey,
      muted_at: mutedAt,
    });
  if (insertError) throw insertError;
}

export async function deleteForYouMutedSearch(
  supabase: SupabaseClient,
  userId: string,
  query: string,
) {
  const queryKey = normalizeForYouSearchQuery(query);
  if (!queryKey) return;

  const { error } = await supabase
    .from("for_you_muted_searches")
    .delete()
    .eq("user_id", userId)
    .eq("query_key", queryKey);
  if (error) throw error;
}

export async function trimForYouMutedSearchesToCap(
  supabase: SupabaseClient,
  userId: string,
  cap = FOR_YOU_MUTED_SEARCHES_MAX_ITEMS,
) {
  const { data, error } = await supabase
    .from("for_you_muted_searches")
    .select("id")
    .eq("user_id", userId)
    .order("muted_at", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length <= cap) return;

  const staleIds = rows.slice(cap).map((row) => row.id);
  const { error: deleteError } = await supabase
    .from("for_you_muted_searches")
    .delete()
    .in("id", staleIds);
  if (deleteError) throw deleteError;
}
