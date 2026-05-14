# Vercel Fluid / active CPU performance work — revert guide

This document records changes aimed at **reducing server-side CPU work** (InnerTube / `youtubei.js`, comment continuation walks, serialized batch I/O) and **avoiding redundant full-page refreshes** on the watch experience. Future agents can revert **granularly** by theme or restore `main` to a commit before this work.

**Vercel context:** [Fluid active CPU](https://vercel.com/docs/functions/fluid-compute) bills CPU while JS is doing real work (parsing, crypto, tight loops). Awaiting network I/O is generally cheaper; **duplicate `getInfo`**, **sequential batch `await`**, and **unbounded continuations** were the main cost drivers called out in review.

### Subagent tracks (what landed in code)

| Track | Focus | Primary files |
|-------|--------|----------------|
| **Dev A** | Dedupe `getInfo` on RSC via React `cache()` | `src/lib/innertubeVideoInfoCache.ts`, `watchVideo.ts`, `youtubeWatchNext.ts` |
| **Dev B** | Bounded concurrency for batch channel resolve | `src/app/api/channels/resolve-batch/route.ts` |
| **Dev C** | Comment/reply continuation caps + gated `console.info` | `youtubeComments.ts`, `youtubeCommentReplies.ts`, `cleantubeCommentsDebug.ts`, comment API routes, `youtubeTypes.ts`, `WatchComments.tsx` |

Lead work (watch client shell, toggles, watch-next route, providers, cookies) is documented in **§1** below.

---

## 1. Watch page: client shell, toggles, no `router.refresh()` for rail/comments

**Intent:** Updating **Up next** and **comments** visibility must not remount the whole watch RSC tree (preserves playback). SSR still skips expensive fetches when cookies say “off”.

| Area | Files |
|------|--------|
| Client shell | `src/components/WatchExperienceClient.tsx` |
| Providers (visibility + server actions) | `src/app/providers.tsx` |
| Root layout (initial cookie reads) | `src/app/layout.tsx` |
| Watch RSC data loading | `src/app/(browse)/watch/[id]/page.tsx` |
| Account UI | `src/components/AccountMenu.tsx` |
| Comments auto-fetch when toggled on | `src/components/WatchComments.tsx` |
| Up next cookie + migration from legacy layout | `src/lib/watchUpNextVisibilityPersistence.ts` |
| Server action (cookie) | `src/app/actions/watchUpNextVisibility.ts` |
| Comments server action (unchanged contract) | `src/app/actions/watchCommentsVisibility.ts` |
| Watch-next API (client fetch when rail on, empty) | `src/app/api/videos/[id]/watch-next/route.ts` |

**Revert options**

- **Remove client-only toggles:** Restore `router.refresh()` after layout/comments changes and drive rail from server-only cookies (older pattern). Delete or bypass `WatchExperienceClient` by inlining prior JSX in `watch/[id]/page.tsx`.
- **Remove Up next as separate feature:** Drop `useWatchUpNextVisible`, `watchUpNextVisibilityPersistence`, `watchUpNextVisibility` action, and `watch-next` route; wire rail back to legacy `cleantube-watch-layout` only (see `src/lib/watchLayoutPersistence.ts`).

**Cookies involved**

- `cleantube-watch-comments-visible` — comments SSR + persistence.
- `cleantube-watch-up-next-visible` — Up next SSR + persistence; if unset, `readWatchUpNextVisibleFromCookieStore` migrates from legacy `cleantube-watch-layout === up_next`.

---

## 2. InnerTube: one `getInfo` per video id per server request (RSC)

**Intent:** `getWatchVideoDetails` and `getWatchNextRelatedVideos` used to call `yt.getInfo` separately on the same navigation. **React `cache()`** dedupes within one server request.

| File | Role |
|------|------|
| `src/lib/innertubeVideoInfoCache.ts` | `getCachedInnertubeVideoInfo` = `cache(loadInnertubeVideoInfo)` |
| `src/lib/watchVideo.ts` | InnerTube path uses `getCachedInnertubeVideoInfo` |
| `src/lib/youtubeWatchNext.ts` | Uses same helper |

**Note:** `GET /api/videos/[id]/watch-next` runs in a **new HTTP invocation**; it does **not** share RSC `cache()`. That is expected unless you add cross-request sharing (not done).

**Revert:** Delete `innertubeVideoInfoCache.ts`; in `watchVideo.ts` / `youtubeWatchNext.ts`, restore direct `getInnertube()` + `getInfo()` as before.

---

## 3. Channel resolve batch: bounded concurrency

**Intent:** Replace strict sequential `await` in a loop with a **worker pool** to shorten wall-clock per batch (same total InnerTube/cache work, higher instantaneous parallelism).

| File | Knobs |
|------|--------|
| `src/app/api/channels/resolve-batch/route.ts` | `RESOLVE_BATCH_CONCURRENCY` (default **5**), `mapWithBoundedConcurrency` |

**Revert:** Restore a simple `for (const lookup of lookups) { await getChannelDetailsCached(...) }` and remove `mapWithBoundedConcurrency`.

**Risk:** More parallel upstream calls per request; if rate limits increase, lower `RESOLVE_BATCH_CONCURRENCY` or revert to sequential.

---

## 4. Comments / replies: caps + opt-in debug logging

**Intent:** Bound worst-case continuation and thread-walk CPU; optional logs for investigation without default prod noise.

| File | Role |
|------|------|
| `src/lib/youtubeComments.ts` | Max continuation pages (`DEFAULT_MAX_COMMENT_CONTINUATION_PAGES`, env `CLEANTUBE_COMMENTS_MAX_CONTINUATION_PAGES`), `fetchLimitedNote` |
| `src/lib/youtubeCommentReplies.ts` | Max thread walk pages (`CLEANTUBE_COMMENTS_MAX_THREAD_WALK_PAGES`) |
| `src/lib/cleantubeCommentsDebug.ts` | `CLEANTUBE_DEBUG_COMMENTS`, `readCleantubeCommentsPositiveIntEnv` |
| `src/lib/youtubeTypes.ts` | `fetchLimitedNote` on comment types |
| `src/app/api/videos/[id]/comments/route.ts` | Debug logging when enabled |
| `src/app/api/videos/[id]/comments/replies/route.ts` | Same |

**Revert:** Remove env reads and caps; strip `fetchLimitedNote` from types and UI (`WatchComments.tsx`); remove `cleantubeCommentsDebug.ts` and imports.

**Env (all optional on Vercel):** `CLEANTUBE_DEBUG_COMMENTS`, `CLEANTUBE_COMMENTS_MAX_CONTINUATION_PAGES`, `CLEANTUBE_COMMENTS_MAX_THREAD_WALK_PAGES`.

---

## 5. Sprint handoff doc

`docs/performance-sprint-assignments.md` — team split and what landed on the lead vs Dev A/B/C tracks (historical context).

---

## 6. Other repo hygiene in the same effort

- `.gitignore` — `.env*.local` (and EOF newline fix with `.cursor/`) to avoid committing local env.

---

## Full revert (git)

To undo **everything** in one step after this lands on `main`:

```bash
git log --oneline -20   # find commit before perf bundle
git revert <commit_sha>..HEAD   # or git reset --hard <sha> on a branch (destructive)
```

Prefer **`git revert`** on `main` for shared branches.

---

## Verification after partial revert

- `npm run build`
- `npx tsc --noEmit`
- `npm run lint`
- Manual: watch page toggles, `/api/channels/resolve-batch`, comment pagination and replies.
