alter table public.watch_progress
  add column if not exists ever_completed boolean not null default false;

update public.watch_progress
set ever_completed = true
where completed = true and ever_completed = false;
