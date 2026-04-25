# Saved Channel Migration

## Status

Experimental and intentionally easy to remove.

## Rip-out Instructions

If automatic saved-channel migration behaves badly:

1. Delete `src/components/SavedChannelMigration.tsx`.
2. Remove the `<SavedChannelMigration />` mount from `src/components/AppShell.tsx`.
3. Delete `src/app/api/channels/resolve/route.ts` if nothing else is using it.
4. Remove `updateSavedChannel` / `updateChannel` if no other feature needs saved-channel patching.

## Decision

CleanTube attempts to enrich existing saved channel entries only when the stored data is high-confidence:

- a canonical `UC...` channel id,
- an `@handle`,
- or a parseable YouTube channel URL.

Plain saved searches such as `Computerphile` or `Marques Brownlee` are not migrated automatically because they can resolve to the wrong channel without a confirmation UI.

## Flow

`SavedChannelMigration` runs in the browse shell, finds saved channels that do not have `channelId`, and calls `/api/channels/resolve` for high-confidence candidates. The API route resolves the candidate server-side through the channel backend and returns normalized channel details. The client patches the saved channel with the canonical title, channel id, and channel URL.

This preserves query-only saved searches while allowing older channel-id, handle, or channel-URL entries to start opening the new channel pages.
