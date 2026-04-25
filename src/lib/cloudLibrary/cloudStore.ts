"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { SavedChannel } from "@/types/savedChannel";
import type { WatchLaterEntry } from "@/types/watchLater";
import type { WatchProgressEntry } from "@/types/watchProgress";

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
  last_watched_at: string;
  updated_at: string;
};

export type CloudSnapshot = {
  watchLater: WatchLaterEntry[];
  savedChannels: SavedChannel[];
  watchProgress: WatchProgressEntry[];
};

function randomId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toSavedChannel(row: SavedChannelRow): SavedChannel {
  return {
    id: row.id,
    name: row.name,
    channelId: row.channel_id ?? undefined,
    channelUrl: row.channel_url ?? undefined,
    searchQuery: row.search_query,
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
    lastWatchedAt: row.last_watched_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchCloudSnapshot(
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

export async function signInWithPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
  emailRedirectTo?: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    ...(emailRedirectTo
      ? { options: { emailRedirectTo } }
      : {}),
  });
}

export async function resetPasswordForEmail(
  supabase: SupabaseClient,
  email: string,
) {
  return supabase.auth.resetPasswordForEmail(email);
}

export async function signOut(
  supabase: SupabaseClient,
) {
  return supabase.auth.signOut();
}

export async function getInitialSession(
  supabase: SupabaseClient,
): Promise<{ session: Session | null; user: User | null }> {
  const { data } = await supabase.auth.getSession();
  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

export function subscribeToAuthChanges(
  supabase: SupabaseClient,
  onChange: (session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });
}

export async function upsertSavedChannels(
  supabase: SupabaseClient,
  userId: string,
  channels: SavedChannel[],
) {
  if (channels.length === 0) return;
  const rows = channels.map((channel) => ({
    id: channel.id || randomId(),
    user_id: userId,
    name: channel.name,
    channel_id: channel.channelId ?? null,
    channel_url: channel.channelUrl ?? null,
    search_query: channel.searchQuery,
  }));
  const { error } = await supabase.from("saved_channels").upsert(rows);
  if (error) throw error;
}

export async function replaceSavedChannels(
  supabase: SupabaseClient,
  userId: string,
  channels: SavedChannel[],
) {
  const { error: deleteError } = await supabase
    .from("saved_channels")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;
  await upsertSavedChannels(supabase, userId, channels);
}

export async function upsertWatchLaterEntries(
  supabase: SupabaseClient,
  userId: string,
  entries: WatchLaterEntry[],
) {
  if (entries.length === 0) return;
  const rows = entries.map((entry) => ({
    id: entry.entryId || randomId(),
    user_id: userId,
    video_id: entry.videoId,
    title: entry.title,
    thumbnail_url: entry.thumbnailUrl,
    channel_name: entry.channelName,
    start_seconds: entry.startSeconds ?? null,
    created_at: entry.addedAt,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("watch_later_entries")
    .upsert(rows, { onConflict: "user_id,video_id" });
  if (error) throw error;
}

export async function replaceWatchLaterEntries(
  supabase: SupabaseClient,
  userId: string,
  entries: WatchLaterEntry[],
) {
  const { error: deleteError } = await supabase
    .from("watch_later_entries")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;
  await upsertWatchLaterEntries(supabase, userId, entries);
}

export async function upsertWatchProgressEntries(
  supabase: SupabaseClient,
  userId: string,
  entries: WatchProgressEntry[],
) {
  if (entries.length === 0) return;
  const rows = entries.map((entry) => ({
    user_id: userId,
    video_id: entry.videoId,
    title: entry.title,
    thumbnail_url: entry.thumbnailUrl,
    channel_name: entry.channelName,
    last_position_seconds: entry.lastPositionSeconds,
    duration_seconds: entry.durationSeconds ?? null,
    completed: entry.completed,
    last_watched_at: entry.lastWatchedAt,
    updated_at: entry.updatedAt,
  }));
  const { error } = await supabase.from("watch_progress").upsert(rows);
  if (error) throw error;
}
