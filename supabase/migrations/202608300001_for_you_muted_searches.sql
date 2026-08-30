create table if not exists public.for_you_muted_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query_key text not null,
  muted_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists for_you_muted_searches_user_query_key
  on public.for_you_muted_searches (user_id, query_key);

create index if not exists for_you_muted_searches_user_muted_at_idx
  on public.for_you_muted_searches (user_id, muted_at desc);

alter table public.for_you_muted_searches enable row level security;

create policy "for_you_muted_searches_select_own"
  on public.for_you_muted_searches
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "for_you_muted_searches_insert_own"
  on public.for_you_muted_searches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "for_you_muted_searches_update_own"
  on public.for_you_muted_searches
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "for_you_muted_searches_delete_own"
  on public.for_you_muted_searches
  for delete
  to authenticated
  using (auth.uid() = user_id);
