# Watch Progress Persistence

## Ideal shape (React + Vercel + Supabase, especially Safari / iOS)

- **Separate concerns**: sample playback in a tight loop (time / player API reads), persist on a **different cadence** (throttled Supabase upserts, coalesced disk). Never block the player thread on JSON, `localStorage`, or awaited network.
- **React**: keep **hot-path progress off React state**. A ref-backed overlay (or external store) holds seconds-until-flush; React state updates on lifecycle (pause, ended, interval persist, tab hide) or when list metadata changes. That avoids re-rendering unrelated `useCloudLibrary()` consumers during playback—important on iOS where main-thread work competes with compositing and video decode.
- **Supabase**: throttle writes (e.g. 10–30s while playing); use **upsert** with a stable primary key per user + video; **fire-and-forget** from the client so microtasks from `fetch` resolution do not chain after each sample. RLS stays on; never use service role in the browser.
- **Vercel**: the browser talks to Supabase directly; no custom server is required for basic progress. For **unload / BFCache** hardening, a tiny **Route Handler** that accepts `navigator.sendBeacon` (or `fetch(..., { keepalive: true })`) can persist a last position when the SPA is torn down—optional infra if tab-close drops remain too common on iOS.
- **Safari / iOS gotchas**:
  - `requestIdleCallback` is **not dependable** on all WebKit builds; always **fallback** to `setTimeout(0)` (this app does).
  - Prefer **`pagehide` + `visibilitychange`** for flush; add **`freeze`** (Page Lifecycle) so progress is written when the page enters the back/forward cache.
  - Timers throttle in background tabs; rely on **flush on hide / pause / unmount**, not on background `setInterval` alone.

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

## Implementation notes (in-app)

- **In-memory samples** (every ~1s while playing, no disk/cloud flags): updates merge into a **`Map` ref** (`watchProgressLiveRef`) so **React state is not updated** on each tick once a row exists. `getProgressByVideoId` / `getResumeSeconds` merge ref + state so resume math stays correct; pause / periodic persist / cloud sync **delete the ref slice** and commit canonical rows to state + disk/cloud.
- **First sample for a new video** still inserts into React state once (metadata + row presence).
- **Anonymous periodic `localStorage`**: writes are coalesced and flushed via `requestIdleCallback` (with `setTimeout(0)` fallback and `timeout: 2000`) so `JSON.stringify` + `setItem` run off the playback hot path when possible. Pause/ended/hide/unmount still flush synchronously.
- **Cloud upserts**: Supabase `upsert` is fire-and-forget (no `await` in the progress path) so promise resolution work does not chain off the sampling cadence; failures are swallowed like before.
- **Player access**: the embedded YT player is cached in a ref after first resolve so progress sampling does not `await getYTPlayer()` every tick.

## Possible infra follow-ups

- **IndexedDB / `idb-keyval`** if the serialized watch-progress blob grows large enough that even deferred writes cause hitches.
- **Background Sync / service worker queue** for offline or flaky networks (not a substitute for throttling on the client).
- **Split React context** so the watch page does not propagate `watchProgress` updates to the entire app tree if profiling still shows render overhead once per second after the above.
