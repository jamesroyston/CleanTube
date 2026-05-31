import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type SavedChannel,
  type SavedChannelEntryKind,
  effectiveSavedChannelKind,
} from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

import type { CloudSnapshot } from "./cloudStore";

type WatchLaterRow = {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  channel_name: string;
  start_seconds: number | null;
  created_at: string;
  updated_at: string;
};

type SavedChannelRow = {
  id: string;
  user_id: string;
  name: string;
  channel_id: string | null;
  channel_url: string | null;
  search_query: string;
  thumbnail_url: string | null;
  entry_kind: string;
  created_at: string;
};

type WatchProgressRow = {
  user_id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  channel_name: string;
  last_position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  ever_completed: boolean;
  last_watched_at: string;
  updated_at: string;
};

function toSavedChannel(row: SavedChannelRow): SavedChannel {
  const entryKind =
    row.entry_kind === "pinned_search" || row.entry_kind === "saved_channel"
      ? (row.entry_kind as SavedChannelEntryKind)
      : effectiveSavedChannelKind({
          channelId: row.channel_id ?? undefined,
          channelUrl: row.channel_url ?? undefined,
          thumbnailUrl: row.thumbnail_url ?? undefined,
        });
  return {
    id: row.id,
    name: row.name,
    channelId: row.channel_id ?? undefined,
    channelUrl: row.channel_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    searchQuery: row.search_query,
    entryKind,
  };
}

function toWatchLaterEntry(row: WatchLaterRow): WatchLaterEntry {
  return {
    entryId: row.id,
    videoId: row.video_id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    channelName: row.channel_name,
    startSeconds: row.start_seconds ?? undefined,
    addedAt: row.created_at,
  };
}

function toWatchProgressEntry(row: WatchProgressRow): WatchProgressEntry {
  return {
    videoId: row.video_id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    channelName: row.channel_name,
    lastPositionSeconds: row.last_position_seconds,
    durationSeconds: row.duration_seconds ?? undefined,
    completed: row.completed,
    everCompleted: row.ever_completed === true || row.completed,
    lastWatchedAt: row.last_watched_at,
    updatedAt: row.updated_at,
  };
}

/** Server-safe library snapshot (no `"use client"` module). */
export async function fetchCloudSnapshotServer(
  supabase: SupabaseClient,
): Promise<CloudSnapshot> {
  const [watchLaterResult, savedChannelsResult, watchProgressResult] =
    await Promise.all([
      supabase
        .from("watch_later_entries")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("saved_channels")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("watch_progress")
        .select("*")
        .order("updated_at", { ascending: false }),
    ]);

  if (watchLaterResult.error) throw watchLaterResult.error;
  if (savedChannelsResult.error) throw savedChannelsResult.error;
  if (watchProgressResult.error) throw watchProgressResult.error;

  return {
    watchLater: (watchLaterResult.data as WatchLaterRow[]).map(toWatchLaterEntry),
    savedChannels: (savedChannelsResult.data as SavedChannelRow[]).map(
      toSavedChannel,
    ),
    watchProgress: (watchProgressResult.data as WatchProgressRow[]).map(
      toWatchProgressEntry,
    ),
  };
}
