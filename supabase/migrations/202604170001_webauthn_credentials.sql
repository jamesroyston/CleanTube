create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text not null,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_name text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint webauthn_credentials_credential_id_key unique (credential_id)
);

create index if not exists webauthn_credentials_user_id_idx
  on public.webauthn_credentials (user_id);

alter table public.webauthn_credentials enable row level security;

create policy "webauthn_credentials_select_own"
  on public.webauthn_credentials
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "webauthn_credentials_delete_own"
  on public.webauthn_credentials
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  kind text not null check (kind in ('registration', 'authentication')),
  user_id uuid references auth.users (id) on delete cascade,
  login_email text,
  expires_at timestamptz not null
);

create index if not exists webauthn_challenges_expires_idx
  on public.webauthn_challenges (expires_at);

alter table public.webauthn_challenges enable row level security;

create or replace function public.webauthn_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = auth
stable
as $$
  select id from auth.users where lower(email) = lower(trim(lookup_email)) limit 1;
$$;

revoke all on function public.webauthn_user_id_by_email(text) from public;
grant execute on function public.webauthn_user_id_by_email(text) to service_role;
