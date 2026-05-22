create table if not exists public.recent_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  searched_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists recent_searches_user_query_key
  on public.recent_searches (user_id, lower(query));

create index if not exists recent_searches_user_searched_at_idx
  on public.recent_searches (user_id, searched_at desc);

alter table public.recent_searches enable row level security;

create policy "recent_searches_select_own"
  on public.recent_searches
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "recent_searches_insert_own"
  on public.recent_searches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "recent_searches_update_own"
  on public.recent_searches
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recent_searches_delete_own"
  on public.recent_searches
  for delete
  to authenticated
  using (auth.uid() = user_id);
