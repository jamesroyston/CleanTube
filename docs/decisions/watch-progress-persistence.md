# Watch Progress Persistence

## Decision

CleanTube separates playback progress tracking from persistence:

- Sample the active player position in memory every 1 second while playing.
- For anonymous users, persist progress to `localStorage` every 10 seconds while playing.
- For signed-in users, sync progress to Supabase every 15 seconds while playing.
- For signed-in users, write `localStorage` only on meaningful lifecycle events: pause, ended, page hide/unload, and component cleanup.

## Rationale

One-second in-memory sampling is cheap: it reads the player time and updates lightweight app state. The jank risk comes from writing too often to synchronous browser storage or from making excessive network/database writes.

`localStorage.setItem` blocks the main thread, so it should be batched rather than called every second. Supabase writes should also be throttled to avoid unnecessary network traffic and database churn.

Signed-in users rely on Supabase for cross-device continuity. `localStorage` remains useful as a local fallback and recovery checkpoint, but it should not mirror every cloud sync tick.

## Future Options

If watch history grows enough that JSON snapshots in `localStorage` become expensive, move progress/history persistence to IndexedDB or a small wrapper such as `idb-keyval`.
