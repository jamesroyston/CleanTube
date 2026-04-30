-- Tracks whether cloud library slices have completed at least one signed-in merge.
-- When true, empty Supabase lists are authoritative ("cloud wins") vs stale localStorage.
create table if not exists public.library_sync_metadata (
  user_id uuid primary key references auth.users (id) on delete cascade,
  saved_channels_initialized boolean not null default false,
  watch_later_initialized boolean not null default false,
  watch_progress_initialized boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists library_sync_metadata_updated_at_idx
  on public.library_sync_metadata (updated_at desc);

alter table public.library_sync_metadata enable row level security;

create policy "library_sync_metadata_select_own"
  on public.library_sync_metadata
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "library_sync_metadata_insert_own"
  on public.library_sync_metadata
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "library_sync_metadata_update_own"
  on public.library_sync_metadata
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "library_sync_metadata_delete_own"
  on public.library_sync_metadata
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Existing accounts with library rows (non-empty slices or prior sync semantics):
-- empty remote counts as authoritative, not stale local restore.
insert into public.library_sync_metadata (
  user_id,
  saved_channels_initialized,
  watch_later_initialized,
  watch_progress_initialized
)
select distinct uid as user_id,
  true as saved_channels_initialized,
  true as watch_later_initialized,
  true as watch_progress_initialized
from (
  select user_id as uid from public.saved_channels
  union
  select user_id as uid from public.watch_later_entries
  union
  select user_id as uid from public.watch_progress
) as lib_users;

create or replace function public.set_library_sync_metadata_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists library_sync_metadata_set_updated_at
  on public.library_sync_metadata;

create trigger library_sync_metadata_set_updated_at
  before update on public.library_sync_metadata
  for each row
  execute procedure public.set_library_sync_metadata_updated_at ();
