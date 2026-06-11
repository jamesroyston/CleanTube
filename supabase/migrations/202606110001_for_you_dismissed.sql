create table if not exists public.for_you_dismissed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  dismissed_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists for_you_dismissed_user_video_key
  on public.for_you_dismissed (user_id, video_id);

create index if not exists for_you_dismissed_user_dismissed_at_idx
  on public.for_you_dismissed (user_id, dismissed_at desc);

alter table public.for_you_dismissed enable row level security;

create policy "for_you_dismissed_select_own"
  on public.for_you_dismissed
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "for_you_dismissed_insert_own"
  on public.for_you_dismissed
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "for_you_dismissed_update_own"
  on public.for_you_dismissed
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "for_you_dismissed_delete_own"
  on public.for_you_dismissed
  for delete
  to authenticated
  using (auth.uid() = user_id);
