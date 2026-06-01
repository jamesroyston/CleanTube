# Shorts for For You — Product & Engineering Plan

**Status:** Draft (planning branch)  
**Branch:** `feat/youtube-shorts`  
**Last updated:** 2026-05-31

## Summary

Bring YouTube Shorts into CleanTube’s signed-in **For You** experience and watch flow without compromising the app’s calm, long-form-first UX. Work is split into three phases: validate Innertube Shorts APIs (spike), surface channel Shorts in feeds (medium), then related Shorts and richer discovery (large). Vertical watch UX may use a dedicated `/shorts/` route and/or an embedded vertical player.

---

## Goals

- Show **relevant Shorts** on For You for users with library signals (subscriptions, history, continue watching).
- Reuse **youtubei.js** Innertube clients already used for search, channel tabs, and watch-next—avoid parallel scraping paths.
- Preserve **performance and Vercel Hobby** constraints: bounded API calls, caching, skeleton-first UI (patterns from existing For You carousels).
- Support **watch** for Short IDs already parsed in `youtubeUrl.ts` (`/shorts/{id}`), with UX appropriate to vertical (~9:16) content.
- Make **content type explicit** in domain models (`VIDEO` vs `SHORT`) so filters are intentional, not accidental drops.

## Non-goals (initial releases)

- Full YouTube Shorts **creation/upload** or comments parity with youtube.com.
- Shorts-only home page replacing long-form For You.
- Infinite vertical **TikTok-style** global feed in Phase 1 (may be Phase 3+ if at all).
- Replacing all `LockupView` handling globally before For You needs it—scope mappers to call sites first.
- Offline download or background playback for Shorts.

---

## Current state (baseline)

| Area | Behavior |
|------|----------|
| **Lockup mappers** | `lockupViewVideoToVideoLike` in `youtubeiAdapters.ts` returns `null` when `content_type !== "VIDEO"`—**Shorts lockups are discarded**. |
| **Channel grids** | `youtubeChannel.ts` filters lockups to `content_type === "VIDEO"`. |
| **Watch-next** | `youtubeWatchNext.ts` drops entries when `content_type` is set and not `"VIDEO"`. |
| **URLs** | Video IDs from `/shorts/{id}` URLs are already supported for routing/id extraction. |
| **For You** | Sections built in `src/lib/forYou/*`; UI uses horizontal `VideoCarouselRow` + `VideoCard` (16:9). |

Exploration notes (youtubei.js):

- **Search:** `search` with type/filter for Shorts (Innertube “shorts” search surface).
- **Channel:** `channel.getShorts()` (or equivalent tab/feed on `Channel` object—confirm against installed youtubei.js version).
- **Player/metadata:** `getShortsVideoInfo()` (or reel/shorts player response)—needed for duration, title, channel, and playback constraints.
- **Nodes:** `ShortsLockupView`, `ReelItem`, and related reel shelf nodes need dedicated mappers → `VideoSummary` (or a new `ShortSummary`) with `kind: "short"`.

---

## Phased delivery

### Phase S — Spike (1–3 days)

**Objective:** Prove we can fetch, map, and play one Short end-to-end with acceptable latency and error handling.

| Task | Notes |
|------|--------|
| Inventory youtubei.js Shorts APIs | Document exact methods on current package version; add a dev-only script or route behind `NODE_ENV`/auth. |
| Prototype mappers | `shortsLockupToSummary`, `reelItemToSummary`; handle missing duration (Shorts often omit or use badge). |
| Single Short playback | Confirm Lite YouTube embed vs iframe `/shorts/` URL; note iOS Safari vertical aspect and safe areas. |
| Filter audit | List every `content_type` / `LockupView` code path; decide **allowlist** vs separate pipeline for Shorts. |
| Caching smoke test | One Short shelf fetch through existing Innertube session reuse (`getInnertube` patterns). |

**Exit criteria:** Demo: paste Short URL → watch page loads; OR dev page lists 5 Shorts from one channel with titles/thumbnails.

**Effort:** **S** (~1–3 eng-days).

---

### Phase M — Channel Shorts on For You (1–2 weeks)

**Objective:** For You sections include Shorts from **subscribed channels** (and optionally top history channels), mixed or in dedicated subsections.

| Task | Notes |
|------|--------|
| Domain type | Extend `VideoSummary` or add `ShortSummary` + discriminated union; wire through `ForYouSection` item types. |
| API layer | `fetchChannelShorts(channelId, limit)` with concurrency cap; integrate into `fetchCandidates.ts` / `buildFeed.ts`. |
| Mapper productionization | Handle `ShortsLockupView` / Short lockups; unit tests with fixture JSON if available. |
| For You section design | e.g. **“Shorts from your subscriptions”** horizontal row; optional 9:16 card variant (`ShortCard` or `VideoCard` `aspectRatio="9/16"`). |
| Ranking | Simple: recency + boost channels with recent history; no ML. |
| Caching | Tag/cache Shorts shelves separately from long-form (`feedCache.ts`); short TTL (e.g. 15–30 min). |
| Empty/error UX | Hide section if zero Shorts; skeleton row matching carousel patterns (`VideoCarouselCardSkeleton` or vertical variant). |

**Exit criteria:** Signed-in user with subscriptions sees ≥1 Shorts subsection when Innertube returns data; clicking opens watch UX (Phase S baseline).

**Effort:** **M** (~5–10 eng-days).

---

### Phase L — Related Shorts & discovery (2–4 weeks)

**Objective:** Shorts discovery beyond subscriptions—search, watch-next reels, and optional vertical session.

| Task | Notes |
|------|--------|
| Search integration | Innertube shorts search; surface in search results tab or filter (product decision). |
| Related Shorts | Map watch-next / reel shelves via `getShortsVideoInfo` + ReelItem; **opt-in** on watch page sidebar or post-roll strip. |
| `/shorts/[id]` route | Canonical Shorts watch URL in CleanTube; shareable links; return navigation to For You. |
| Vertical player UX | Swipe-up next Short in session (optional queue from shelf); respect reduced motion; keyboard/a11y fallback (next/prev buttons). |
| For You expansion | “Because you watched …” Shorts mix; dedupe against long-form continue watching. |
| Observability | Log Innertube failures by endpoint; rate-limit user-triggered refresh. |

**Exit criteria:** User can open a Short from For You, consume related Shorts in vertical flow, and return to For You without broken history/progress.

**Effort:** **L** (~10–20 eng-days, depending on vertical player scope).

---

## API & mapper work (cross-cutting)

1. **`ShortSummary` shape (proposed)**  
   - `id`, `title`, `channelId`, `channelName`, `thumbnailUrls`, `viewCountText?`, `kind: "short"`, `durationFormatted?` (optional).  
   - Do **not** reuse long-form-only fields without guards in UI.

2. **New/updated functions (illustrative)**  
   - `lockupViewShortToSummary(node)` — `content_type === "SHORT"` (confirm exact enum string in Innertube).  
   - `reelItemToSummary(node)` — reel shelf items.  
   - `fetchChannelShorts(channelId, opts)` — wraps `channel.getShorts()`.  
   - `fetchShortsSearch(query, opts)` — Phase L.  
   - Relax or branch **`lockupViewVideoToVideoLike`**: either sibling mapper or `content_type` switch with explicit callers.

3. **Session & errors**  
   - Reuse existing Innertube client lifecycle; treat Shorts endpoints as best-effort (sections omit on failure).  
   - Align with Hobby: cap parallel channel Shorts fetches (e.g. 3–5 at a time).

4. **Tests**  
   - Fixture-based mapper tests; one integration test behind CI skip if no credentials.

---

## For You section design

- **Placement:** Below “Continue watching” / primary long-form rows; Shorts should not push continue-watching below the fold on mobile.  
- **Layout:** Horizontal carousel (consistent with current For You); **9:16 thumbnails** in fixed-width cards with clear “Short” badge (optional).  
- **Density:** 8–12 items per section max initially; “See more” → `/shorts` or channel Shorts tab (Phase L).  
- **Signed-out:** Hide Shorts sections or show static explainer—match `ForYouHome` signed-in gating.  
- **Accessibility:** Carousel `aria-label`; each card exposes title + channel; vertical watch page must expose focus order for next/prev.

---

## Watch UX options

| Option | Pros | Cons |
|--------|------|------|
| **A. Long-form watch page + 9:16 letterbox** | Reuses `/watch/[id]` | Poor Shorts-native feel |
| **B. `/shorts/[id]` vertical layout** | Familiar Shorts UX | New layout + gesture stack |
| **C. Modal / drawer vertical player** | Fast to ship from For You | Deep linking harder |

**Recommendation:** Spike **B** for canonical Short links; For You cards link to `/shorts/[id]` when `kind === "short"`. Long-form `/watch/[id]` may redirect or offer “Open as Short” if ID is Short-only.

**Progress:** Shorts typically short; optional lightweight progress (watched threshold e.g. 80%)—defer full cloud sync until usage proves need.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Innertube schema drift (`ShortsLockupView`, `content_type` values) | Version-pin youtubei.js; mapper tests; feature flag sections |
| Embed restrictions for vertical Shorts | Fallback link to youtube.com; document in spike |
| Feed latency (N channel Shorts calls) | Cache, limit channels, stagger fetches |
| UX clutter on calm home | Dedicated subsection titles; limit to 1–2 Shorts rows in Phase M |
| Accidental Shorts in long-form grids | Explicit `kind` filter at render time |
| Vercel/Supabase cost | Same as For You: cache aggressively; no per-scroll API calls |

---

## Success criteria

- **Phase S:** Documented API entry points + working play for one Short ID.  
- **Phase M:** ≥80% of test accounts with subscriptions see Shorts subsection when YouTube returns Shorts; no regression to long-form For You TTFB (cached path).  
- **Phase L:** Related Shorts session completes 3+ items without console errors; `/shorts/[id]` share URL works on mobile Safari.  
- **Quality:** No increase in client errors on `/api/for-you`; mapper coverage for Short node types.

---

## Effort summary

| Phase | Size | Calendar (rough) |
|-------|------|------------------|
| S — Spike | S | 1–3 days |
| M — Channel Shorts / For You | M | 1–2 weeks |
| L — Related + vertical UX | L | 2–4 weeks |

**Total (MVP through Phase M):** ~2 weeks. **Full L:** +2–4 weeks.

---

## Open questions

1. Exact Innertube string for Short lockups (`SHORT` vs `SHORTS` vs reel-specific types)—confirm in spike.  
2. Should Shorts appear in **global search** before For You (user expectation)?  
3. Parental / content filters: any Shorts-specific policy beyond existing YouTube embed?  
4. Feature flag: per-user env, or ship section hide when empty only?

---

## References (in-repo)

- `src/lib/youtubeiAdapters.ts` — LockupView → long-form only today  
- `src/lib/youtubeChannel.ts` — channel tab lockup filter  
- `src/lib/youtubeWatchNext.ts` — watch-next content_type filter  
- `src/lib/forYou/*` — feed composition and caching  
- `src/components/ForYouFeedView.tsx`, `VideoCarouselRow.tsx` — section UI patterns  
- `src/lib/youtubeUrl.ts` — Short URL id parsing  
