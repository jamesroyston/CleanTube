"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { FOR_YOU_DISMISSED_MAX_ITEMS } from "./types";
import type { ForYouDismissedEntry } from "./types";

type ForYouDismissedRow = {
  id: string;
  user_id: string;
  video_id: string;
  dismissed_at: string;
};

function toDismissedEntry(row: ForYouDismissedRow): ForYouDismissedEntry {
  return {
    videoId: row.video_id,
    dismissedAt: row.dismissed_at,
  };
}

export async function fetchForYouDismissed(
  supabase: SupabaseClient,
): Promise<ForYouDismissedEntry[]> {
  const { data, error } = await supabase
    .from("for_you_dismissed")
    .select("id, user_id, video_id, dismissed_at")
    .order("dismissed_at", { ascending: false })
    .limit(FOR_YOU_DISMISSED_MAX_ITEMS);

  if (error) throw error;
  return (data as ForYouDismissedRow[]).map(toDismissedEntry);
}

export async function upsertForYouDismissed(
  supabase: SupabaseClient,
  userId: string,
  videoId: string,
) {
  const dismissedAt = new Date().toISOString();
  const { data, error: updateError } = await supabase
    .from("for_you_dismissed")
    .update({ dismissed_at: dismissedAt })
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .select("id");
  if (updateError) throw updateError;
  if (data && data.length > 0) return;

  const { error: insertError } = await supabase.from("for_you_dismissed").insert({
    user_id: userId,
    video_id: videoId,
    dismissed_at: dismissedAt,
  });
  if (insertError) throw insertError;
}

export async function trimForYouDismissedToCap(
  supabase: SupabaseClient,
  userId: string,
  cap = FOR_YOU_DISMISSED_MAX_ITEMS,
) {
  const { data, error } = await supabase
    .from("for_you_dismissed")
    .select("id")
    .eq("user_id", userId)
    .order("dismissed_at", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length <= cap) return;

  const staleIds = rows.slice(cap).map((row) => row.id);
  const { error: deleteError } = await supabase
    .from("for_you_dismissed")
    .delete()
    .in("id", staleIds);
  if (deleteError) throw deleteError;
}

export async function deleteAllForYouDismissed(
  supabase: SupabaseClient,
  userId: string,
) {
  const { error } = await supabase
    .from("for_you_dismissed")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}
