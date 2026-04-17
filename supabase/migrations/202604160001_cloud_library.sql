create extension if not exists pgcrypto;

create table if not exists public.saved_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  channel_id text,
  channel_url text,
  search_query text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists saved_channels_user_search_query_key
  on public.saved_channels (user_id, lower(search_query));

create unique index if not exists saved_channels_user_channel_id_key
  on public.saved_channels (user_id, channel_id)
  where channel_id is not null;

create table if not exists public.watch_later_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  title text not null,
  thumbnail_url text not null,
  channel_name text not null,
  start_seconds integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists watch_later_entries_user_video_id_key
  on public.watch_later_entries (user_id, video_id);

create table if not exists public.watch_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  title text not null,
  thumbnail_url text not null,
  channel_name text not null,
  last_position_seconds integer not null default 0,
  duration_seconds integer,
  completed boolean not null default false,
  last_watched_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, video_id)
);

alter table public.saved_channels enable row level security;
alter table public.watch_later_entries enable row level security;
alter table public.watch_progress enable row level security;

create policy "saved_channels_select_own"
  on public.saved_channels
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "saved_channels_insert_own"
  on public.saved_channels
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "saved_channels_update_own"
  on public.saved_channels
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_channels_delete_own"
  on public.saved_channels
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "watch_later_select_own"
  on public.watch_later_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "watch_later_insert_own"
  on public.watch_later_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "watch_later_update_own"
  on public.watch_later_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watch_later_delete_own"
  on public.watch_later_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "watch_progress_select_own"
  on public.watch_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "watch_progress_insert_own"
  on public.watch_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "watch_progress_update_own"
  on public.watch_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watch_progress_delete_own"
  on public.watch_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);
