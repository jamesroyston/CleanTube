# Sign-In-Only Library Persistence

## Decision

Cleantube no longer persists library data (watch history, watch later, saved channels, pinned searches, recent searches) for anonymous users. All library features require sign-in; data lives in Supabase only.

The previous local-first architecture is archived in `docs/archive/local-first-library-persistence.md` for potential restoration.

## Rationale

- **Product clarity:** Library data belongs to an account, not the device.
- **Engineering simplicity:** Removes dual-write (localStorage + cloud), sign-in merge branches, cross-tab storage sync, and deferred disk queues.
- **Performance:** Eliminates localStorage JSON churn; mutations use incremental cloud CRUD instead of replace-all sync.

## Implementation summary

| Area | Change |
|------|--------|
| `CloudLibraryContext` | Cloud-only state; `canPersistLibrary` gate; fetch-only sign-in sync |
| Mutations | Incremental upsert/delete per row (not delete-all + reinsert) |
| Sign-in sync | Skip on `TOKEN_REFRESHED`; in-flight dedupe; no local merge |
| `LiteYouTubeEmbed` | Progress tracking only when `canPersistLibrary` |
| UI | `LibrarySignInPrompt` on library pages; auth links on save buttons |
| `localStore.ts` | Retained in repo for archive/restore; not used at runtime |

## Sync state machine

- `signed_out` — no session; library arrays empty
- `syncing` — fetching cloud snapshot after sign-in
- `synced` — cloud snapshot loaded into React state
- `error` — sync failed (JWT or network)
- `unavailable` — Supabase not configured

## What stays device-local (unchanged)

Theme, watch layout prefs, search scroll restore, last-search session, channel page cache — these are navigation/UI prefs, not library data.

## Restore local-first

See `docs/archive/local-first-library-persistence.md` → “How to restore”.
