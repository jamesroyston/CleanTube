# Performance sprint — work split

**Revert / audit doc:** [vercel-fluid-cpu-performance-revert-guide.md](./vercel-fluid-cpu-performance-revert-guide.md) — file-level inventory and rollback steps for Fluid / active CPU–related changes.

**Done (lead):** Watch page: client-driven **comments** and **Up next** toggles (no `router.refresh()`); `WatchExperienceClient` + `GET /api/videos/[id]/watch-next`; separate visibility contexts + server actions for cookies (`AppProviders`). Theatre / “watch layout” radio removed in favor of two switches.

## Dev A — InnerTube / watch CPU *(subagent dispatched)*

- **Dedupe `getInfo`:** Share one `yt.getInfo(videoId)` result between watch metadata and “Up next” (`watchVideo.ts`, `youtubeWatchNext.ts`, `WatchExperienceClient`, watch-next API route as needed). Same UX, fewer InnerTube round-trips.
- **Watch HTML fallback:** Profile `extractBalancedJson` / `mergeDescriptionFromWatchHtml`; gate or narrow when InnerTube metadata is already complete.

## Dev B — Batch resolve *(subagent dispatched)*

- **`resolve-batch`:** Bounded concurrency (pool ~4–5), stable order vs input `lookups`, per-item errors unchanged; comment the rate-limit rationale in code.

## Dev C — Comments / replies guardrails + debug logs *(subagent dispatched)*

- **Caps:** Conservative limits on continuation / thread walk in `youtubeComments.ts` / `youtubeCommentReplies.ts` (and routes), with clear constants or env; avoid silent broken UX when capped.
- **Logging:** Optional `console.info` (or similar) gated by env (e.g. `CLEANTUBE_DEBUG_COMMENTS=1`), default off in prod.

## Lead / backlog (not yet assigned to a subagent)

- **Broader observability:** Route-level timing / `getInfo` vs HTML in watch path (beyond comments-only debug flag).
- **Vercel dashboard:** Compare Fluid / runtime metrics after Dev A–C land.

## QA

- Watch: toggle **Up next** and **Show comments** while video is playing — player must not restart.
- Hard refresh with each cookie combination; SSR first paint matches client toggles.
