-- Cloud-wins library redesign: app no longer uses tombstones or slice-init metadata.
-- Drop tables (policies and triggers on them are removed with the tables).

drop table if exists public.library_tombstones;

drop table if exists public.library_sync_metadata;

drop function if exists public.set_library_sync_metadata_updated_at() cascade;
