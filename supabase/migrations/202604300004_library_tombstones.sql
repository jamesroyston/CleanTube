create table if not exists public.library_tombstones (
  user_id uuid not null references auth.users (id) on delete cascade,
  slice text not null check (
    slice in (
      'saved_channels',
      'watch_later',
      'watch_progress'
    )
  ),
  canonical_key text not null,
  deleted_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, slice, canonical_key)
);

create index if not exists library_tombstones_user_slice_idx
  on public.library_tombstones (user_id, slice);

alter table public.library_tombstones enable row level security;

create policy "library_tombstones_select_own"
  on public.library_tombstones
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "library_tombstones_insert_own"
  on public.library_tombstones
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "library_tombstones_update_own"
  on public.library_tombstones
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "library_tombstones_delete_own"
  on public.library_tombstones
  for delete
  to authenticated
  using (auth.uid() = user_id);
