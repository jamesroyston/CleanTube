alter table public.saved_channels
  add column if not exists thumbnail_url text;
