-- Persist whether a library row was created as "save channel" vs "pin search" so UI and
-- merge logic don't infer from nullable channel_id (saved channels occasionally lack IDs).

alter table public.saved_channels
  add column if not exists entry_kind text;

update public.saved_channels
set entry_kind = 'saved_channel'
where channel_id is not null;

update public.saved_channels
set entry_kind = 'saved_channel'
where entry_kind is null
  and (
    (channel_url is not null and length(trim(channel_url)) > 0)
    or (thumbnail_url is not null and length(trim(thumbnail_url)) > 0)
  );

update public.saved_channels
set entry_kind = 'pinned_search'
where entry_kind is null;

alter table public.saved_channels
  alter column entry_kind set not null;

alter table public.saved_channels
  drop constraint if exists saved_channels_entry_kind_check;

alter table public.saved_channels
  add constraint saved_channels_entry_kind_check
  check (entry_kind in ('saved_channel', 'pinned_search'));

-- Old global uniqueness on lower(search_query) prevented both a pinned search and a saved
-- channel sharing the same text; drop it and scope uniqueness to pinned rows only.

drop index if exists public.saved_channels_user_search_query_key;

create unique index if not exists saved_channels_user_pinned_search_key
  on public.saved_channels (user_id, lower(search_query))
  where entry_kind = 'pinned_search';
