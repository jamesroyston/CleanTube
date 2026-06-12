# Future optimizations — Vercel Fluid CPU / compute

How Fluid bills: **Active CPU** (time the CPU actually executes) + **provisioned memory** +
**invocations**. Time spent idle-waiting on network I/O is effectively free. So the levers are:

1. **Cut CPU-bound work** — large JSON deserialization (`youtubei.js` parser), string scans, etc.
2. **Cut invocations** — fewer route hits per page; skip calls that deterministically fail.
3. **Maximize cache hits** — a cached response runs zero application code.

Key fact this doc builds on: InnerTube (`youtubei.js`) `getInfo` (watch `/player`) and
`getChannel` (`/browse`) are **bot-challenged from datacenter IPs and deterministically fail on
Vercel**, while `search` works. Data API v3 (`videos.list`, `channels.list`, `playlistItems.list`)
is the reliable datacenter path and is already wired as a fallback (see
`src/lib/youtubeDataApi.ts`). The watch waterfall is now InnerTube → Data API → oEmbed (HTML scrape
removed).

---

## 1. Skip InnerTube on the watch page in production (Data API primary when key set)

**Today:** `loadWatchVideoDetails` tries InnerTube `getInfo` first, then Data API. On Vercel the
`getInfo` attempt always fails — we pay its network round-trips, partial `youtubei.js`
deserialization, and error handling before falling through to the Data API anyway.

**Change:** when `isYoutubeDataApiEnabled()`, make the **Data API the primary** source for watch
metadata and only use InnerTube as a fallback (or skip it). Don't branch on `NODE_ENV`; branch on
"key present", which is the real signal that we have a reliable datacenter source.

**Wins:** removes the wasted `getInfo` attempt + parser cost on the hottest route; fewer external
round-trips; lower latency.

**Trade-offs / notes:**
- Localhost *with* a key would start spending quota where free InnerTube would have worked. Dev
  rarely sets the key; if needed, add an opt-out env (e.g. `WATCH_PREFER_INNERTUBE=1`).
- Data API watch metadata needs a 2nd `channels.list` call for the channel avatar (2 units, 2
  round-trips). Amortize by caching the avatar separately with a long TTL (avatars rarely change),
  or drop the avatar lookup if it isn't essential.

## 2. Cross-request cache for watch metadata (`use cache`)

**Today:** `getWatchVideoDetails` is wrapped in React `cache()` (per-request only). The watch page
resolves metadata **twice per load**: once in `generateMetadata` (SSR, for `<title>`/`<meta>`) and
once in the `/api/videos/[id]` route from the client SWR fetch — two separate invocations, neither
shared. Only the Data API sub-fetch has a Data Cache (`revalidate: 3600`).

**Change:** add `"use cache"` + `cacheLife`/`cacheTag` to watch metadata keyed by video id (same
pattern already used by `youtubeChannel.ts`, `youtubeChannelResolveCache.ts`,
`youtubeSearchCache.ts`, `forYou/feedCache.ts`).

**Wins:** likely the single biggest CPU reducer. Repeat loads (and the SSR + client double-resolve)
become cache hits with ~zero InnerTube/Data API compute. Title/description/channel are stable;
view count going stale for an hour is fine. Suggested `revalidate` ~1–6 h.

## 3. Don't waste `getInfo` on related / comments in production

**Today:** the watch page fires three independent client requests → three invocations:
`/api/videos/[id]` (metadata), `/api/videos/[id]/watch-next` (related), `/api/videos/[id]/comments`.
Related (`getWatchNextRelatedVideos`) and comments (`getWatchVideoComments`) both call InnerTube
`getInfo` / `getComments`, which fail on Vercel — so each watch load pays two more doomed `getInfo`
attempts and two invocations that return nothing.

**Options:**
- **Circuit breaker:** module-level (per warm instance — Fluid reuses instances) counter that, after
  N consecutive InnerTube watch/browse failures, short-circuits to "skip InnerTube" for a cooldown
  with occasional half-open probes. Stops the repeated wasted attempts on the hot path.
- **Client gating:** don't fire the watch-next / comments fetches when there's no working backend in
  the current environment, saving whole invocations.
- For comments specifically, replace the backend — see #4.

## 4. Comments via YouTube Data API v3 (`commentThreads.list`)  *(moved from future-prompts)*

Comments are InnerTube-based (`yt.getComments` in `youtubeComments.ts` /
`youtubeCommentReplies.ts`) and break on Vercel. They also already needed CPU guardrails
(`CLEANTUBE_COMMENTS_MAX_CONTINUATION_PAGES`, `CLEANTUBE_COMMENTS_MAX_THREAD_WALK_PAGES`,
`fetchLimitedNote`) because walking InnerTube continuation pages is CPU-heavy.

**Direction:** add a Data API backend in `youtubeDataApi.ts` and wire it as a fallback in
`getWatchVideoComments` (mirroring the watch/channel pattern):
- `commentThreads.list` (`part=snippet,replies`, `order=relevance|time`, `videoId`, `pageToken`,
  `maxResults=20..100`) — **1 unit/call** → top-level comments + first replies.
- `comments.list` (`parentId`) only when expanding a thread beyond the inline replies.
- Map to the existing `WatchVideoComment` / `WatchVideoComments` shapes; keep `nextPageToken` as the
  opaque `pageToken`.

**Wins:** reliable from Vercel **and** lower CPU than InnerTube continuation walking (no parser, no
multi-page walk). Gate on the same `YOUTUBE_API_KEY`; inert without it.

**Caveat:** quota — `commentThreads.list` is 1 unit, but heavy comment browsing adds up. Cache pages
(`use cache`) and keep the existing page caps.

## 5. Consolidate to one `getInfo` per watch (when InnerTube is the source)  *(moved from future-prompts)*

**Problem:** when InnerTube *is* the source (localhost, or if we keep it as a fallback),
`/api/videos/[id]` and `/api/videos/[id]/watch-next` are separate invocations that each call
`getInfo` for the same video id — `cache()` can't dedupe across invocations, so it's two full
player/next round-trips + two deserializations per watch load.

**Preferred direction:** load `getInfo` once and derive both **`WatchVideoDetails`** (via
`videoInfoToWatchDetails`) and the **related list** from the same `info.watch_next_feed`. Options:
serve both from a single route/payload, or add a short-lived per-(instance,videoId) memo so the
second invocation reuses the first result. (Note: with #1, in production the metadata route won't
call `getInfo` at all, so this mainly helps localhost and the related rail.)

**Edge case:** theatre / focus mode skips the related fetch, so no `getInfo` runs there today.

## 6. youtubei.js hardening / telemetry  *(moved from future-prompts)*

- Controlled fallback when `Innertube.search` fails or parser churn spikes: retry with a different
  youtubei client profile (`WEB` → `ANDROID`), then fall back to a stable server-side path.
- Keep parser-noise suppression limited to known non-fatal node mismatches
  (`VideoSummaryContentView` / `VideoSummaryParagraphView`); keep logging all other parser errors.
- Lightweight runtime telemetry (per-query counters for parser/fallback events) to detect breakage
  early without flooding logs — also the cheapest way to *measure* how often InnerTube actually
  fails in prod, which validates #1/#3.
- Pin `youtubei.js`; upgrade intentionally after smoke tests (`search`, watch details,
  continuations, newest sort).

---

## Suggested order

1. **#2 `use cache` on watch metadata** — biggest CPU win, lowest risk, no behavior change.
2. **#1 Data API primary on watch when key set** — removes the doomed `getInfo` on the hot path.
3. **#3 skip/short-circuit related + comments in prod** — stops two wasted invocations per load.
4. **#4 comments via Data API** — restores comments on Vercel and cuts comment CPU.
5. **#5 / #6** — opportunistic; #6's telemetry is worth adding early to quantify the rest.
