# Saved prompts (for later)

## Theater / windowed fullscreen (not yet implemented)

> And add a theater like view. I'm thinking of a case where I want the video to be full screen within the window, but not true full screen on my computer. Implement something like this where the video takes up the entire width or entire height so the video takes up the available browser window space, supporting resizing.

## Redirector / first-visit tip (not yet implemented)

> On first land of users, add a tip prompt that only shows once. It should provide instructions on how to setup an extension like chrome store's redirector so that users can click on external links to youtube and be directed to cleantube. Redirector uses regex and $1, $2 param passing to handle youtube detection, redirection, and param forwarding. This tip needs to be accessible from somewhere so users can see it again if they clicked out too quickly the first time. This would make it actually usuable for users trying to avoid real youtube for whatever reason.

## Sidebar toggle + settings menu (not yet implemented)

> Make the sidebar toggleable and stuff the color palette chooser into a settings menu.

## Mobile header improvements (not yet implemented)

> Make the header more functional on mobile. Maybe replace the logo name with just the logo? and stuff the toggle theme button functionality into the new menu when mobile.

## Search loading state (not yet implemented)

> Add a loading state or skeletons or anything better for displaying loading state for when a search is initiated.

## Preserve sort mode between searches (not yet implemented)

> When I select a different search sort mode and then search again, I want the search mode preserved unless I reset it.

## YouTube Data API v3 migration (not yet implemented)

**Goal:** Replace or complement **youtubei.js** (InnerTube) with the **official [YouTube Data API v3](https://developers.google.com/youtube/v3/docs/search/list)** for search (and optionally metadata), so behavior is **fully documented and stable** (`order=date`, `publishedAfter` / `publishedBefore`, `videoDuration`, `regionCode`, etc.).

**Why:** InnerTube clients depend on undocumented endpoints and parser updates; **`search.list`** is the supported path for granular search—at the cost of a **Google Cloud project**, **API key** (server-only), and **quota** (each `search.list` call is **100 units**; default daily budget is often ~10k units unless increased).

**Current stack:** **`youtubei.js`** (`Innertube.search` / `getBasicInfo`) in `src/lib/youtube.ts`, `youtubeiClient.ts`, `youtubeiAdapters.ts`. “Upload date (newest)” uses **`SearchFilters`** with `sort_by: 'upload_date'` (no hard upload-date window).

**Implementation sketch:** Server-side route or `searchVideos` branch; env e.g. `YOUTUBE_DATA_API_KEY`; map `search.list` + optional **`videos.list`** into **`VideoSummary`**; keep **youtubei.js** as fallback if quota is exhausted.

### youtubei.js hardening notes (pending)

- Add a controlled fallback path when `Innertube.search` fails or parser churn spikes:
  - first retry with a different youtubei client profile (`WEB` -> `ANDROID`),
  - then fallback to a stable server-side API path (YouTube Data API when available).
- Keep parser-noise suppression limited to known non-fatal node mismatches (`VideoSummaryContentView` / `VideoSummaryParagraphView`) and keep logging all other parser errors.
- Add lightweight runtime telemetry (counter per query for parser/fallback events) so we can detect breakages early without flooding logs.
- Consider pinning `youtubei.js` and upgrading intentionally after quick smoke tests (`search`, `watch details`, continuations, newest sort).

### Revert plan: re-implement youtube-sr quickly

If we decide to fully revert the youtube backend:

1. Dependencies/config
   - Remove `youtubei.js`, add `youtube-sr`.
   - Update `next.config.ts` `serverExternalPackages` back to `youtube-sr`.
2. Core library files
   - Replace `src/lib/youtube.ts` with `youtube-sr` search/getVideo implementation.
   - Restore/adjust `src/lib/youtubeRequest.ts` for request headers used by youtube-sr.
   - Revert `src/lib/watchVideo.ts` to `YouTube.getVideo(...)` + oEmbed fallback.
3. Type/adapter layer
   - Remove `youtubeiClient.ts`, `youtubeiAdapters.ts`, and either:
     - restore `serializeVideo.ts` to consume youtube-sr `Video`, or
     - keep current summary shape and add a small youtube-sr -> `VideoLikeForSummary` adapter.
4. URL/validation
   - Either keep `youtubeUrl.ts` validation/parser (library-agnostic), or switch back to `YouTube.validate`/regex.
5. Verify
   - Run `npm run build`, spot-check queries with relevance/newest sorts, watch page metadata, and thumbnail fallback behavior.

## Passkeys (WebAuthn) — implemented (`@simplewebauthn`)

**What shipped:** **Custom WebAuthn** using **`@simplewebauthn/server`** (Route Handlers) and **`@simplewebauthn/browser`**. Credentials are stored in **`webauthn_credentials`**; challenges in **`webauthn_challenges`**. Passkey sign-in uses **`SUPABASE_SERVICE_ROLE_KEY`** only on the server to exchange a verified assertion for a normal Supabase session (magic-link token + `verifyOtp`).

**Supabase MFA (TOTP / SMS):** Handled in the auth UI after password sign-in (`mfa.challenge` / `challengeAndVerify` / `verify`) when the project requires **AAL2**.

### `/auth/callback` and PKCE-style redirects

OAuth is **not** exposed in the UI. Some Supabase flows (e.g. OAuth or certain email/link flows) still expect a **redirect URL** that receives `?code=` and exchanges it for a session server-side (`exchangeCodeForSession`).

- If the repo **includes** `src/app/(auth)/auth/callback/route.ts` (or similar), keep **Authentication → URL configuration** in Supabase aligned with `http://localhost:3000/auth/callback` and production `/auth/callback` when those flows are used.
- If that route is **removed** to simplify the codebase, **re-add** it when enabling OAuth, magic-link PKCE, or any redirect-based flow that returns an authorization `code`. Document the redirect URLs whenever that happens.

---

## EPIC: Cloud library, auth, watch progress (Supabase) — not yet implemented

**Goal:** Persist saved library (channels, watch later, and later watch progress / history) across devices. Prefer **Supabase** (Auth + Postgres + RLS); **Vercel Postgres** was considered as an alternative if we ever want DB-only without Supabase’s auth/session helpers.

**Auth (expected):** Sign-up, login, reset password; custom passkeys (see **Passkeys (WebAuthn)** above) plus optional Supabase MFA (TOTP/SMS) in the UI; OAuth not in the UI. Anonymous users must still work: **session/local storage** for in-browser-only use when not signed in.

**Product behaviors (once built):**

- Track **watch progress** (position in seconds) so we can reopen with the existing **`?t=`** timestamp param on the watch route / embed.
- **History page** plus a **history** area in the sidebar (parallel to watch later + saved channels): show in-progress items and how far along.
- **Home:** a **“Currently in progress”** strip to jump back into partial watches.
- **Watch later:** if a video was partially watched before, **resume from progress** when opening from that watch-later row (when a WL entry exists for that video).
- **Migration on first deploy:** On sign-up or login, **merge** existing client **watch-later (and related) session state** into the authenticated user’s cloud rows. Users who never sign in keep current **session-only** behavior unchanged.

**Security note:** Never commit real Supabase keys or `.env.local`. Use Vercel env vars for production. If keys were pasted into chat, rotate them in the Supabase dashboard.

### Supabase setup reference (implement with placeholders only in repo)

- Install: `@supabase/supabase-js` and **`@supabase/ssr`** (for cookie-based server + browser clients in App Router).
- Env (local / Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or project’s documented anon/publishable key name — match Supabase dashboard).
- Add **`utils/supabase/server.ts`**, **`utils/supabase/client.ts`**, and **middleware** that refreshes the session (pattern from Supabase Next.js docs: `createServerClient` + cookie `getAll` / `setAll`).
- Optional: `npx skills add supabase/agent-skills` for editor/agent helpers.

### Revert-friendly commit chunks (JIRA-style epic labels)

Use one epic prefix in commit subjects, e.g. **`[CLOUD-LIB-01]`** … **`[CLOUD-LIB-0n]`**, so `git log` and `git revert` ranges stay obvious.

| Chunk ID | Scope (revert = undo this slice) |
|----------|----------------------------------|
| **CLOUD-LIB-01** | Dependencies only: `package.json` / lockfile for `@supabase/supabase-js`, `@supabase/ssr`. |
| **CLOUD-LIB-02** | Env **documentation** only: `.env.example` (placeholders), README “configure Supabase” — no secrets. |
| **CLOUD-LIB-03** | Supabase **client helpers**: `utils/supabase/server.ts`, `utils/supabase/client.ts`, optional `middleware.ts` wiring in `middleware.ts` (session refresh only, no UI). |
| **CLOUD-LIB-04** | **Database schema** (SQL migrations or Supabase migration files): tables for user-scoped watch later, saved channels, progress, history; **RLS** policies. |
| **CLOUD-LIB-05** | **Data access layer**: typed repos/functions (fetch/mutate) used by the app; still callable with “no user” → no-op or local-only. |
| **CLOUD-LIB-06** | **Auth UI**: sign-in, sign-up, reset password routes/components; link from header/settings. |
| **CLOUD-LIB-07** | **Session bridge**: when user logs in, merge **local/sessionStorage** watch-later (and peers) into Supabase; dedupe; keep local fallback for logged-out users. |
| **CLOUD-LIB-08** | **Dual-mode contexts**: refactor saved channels / watch later to read/write **local session OR cloud** behind one interface (feature-flag or “if session user”). |
| **CLOUD-LIB-09** | **Watch progress**: persist position on interval/pause/unmount from `LiteYouTubeEmbed` (or player events); store `last_position_seconds`, `updated_at`. |
| **CLOUD-LIB-10** | **History** sidebar section + **history page** (in-progress + completed rules TBD). |
| **CLOUD-LIB-11** | **Home** “in progress” row/cards using same progress source. |
| **CLOUD-LIB-12** | **Watch later resume**: pass `?t=` from stored progress when launching from WL if progress exists. |

**Revert tips:** Prefer **one chunk per PR** or one sequential merge; to roll back a slice, `git revert <commit>` for that chunk’s SHA. If two chunks touch the same file heavily, revert newer chunk first. Keep **CLOUD-LIB-03** and **CLOUD-LIB-04** separate so infra can be reverted without dropping UI, and vice versa.

### Principal-engineer implementation plan

Build this as a set of narrow, understandable seams instead of a broad rewrite:

1. **Infra first, but inert by default.**
   Add Supabase packages, env placeholders, SSR/browser helpers, and `proxy.ts`, but make the app behave exactly as it does today when env vars are missing. A branch deploy should still build and run in local-only mode.
2. **One library contract, two backing stores.**
   Introduce a typed library/auth layer that exposes the app’s actual domain concepts:
   `savedChannels`, `watchLater`, `watchProgress`, `history`, and auth session state.
   Local storage remains the logged-out implementation; Supabase becomes the signed-in implementation.
3. **Bridge state at auth boundaries.**
   On login/sign-up, merge local watch-later, saved channels, and progress into the user’s cloud rows with deterministic dedupe rules, then hydrate UI from cloud.
4. **Add product UI after the seam exists.**
   Auth page, account actions, history page/sidebar, home in-progress row, and watch-later resume should all consume the shared contract instead of talking to storage directly.
5. **Track progress from the player with best-effort writes.**
   Persist on interval, pause-ish transitions, and unmount; throttle writes so navigation stays responsive.

### Proposed build order

- **CLOUD-LIB-01/02**: install dependencies, add env placeholders, expand README, and record this plan.
- **CLOUD-LIB-03/04**: add Supabase client helpers, `proxy.ts`, and SQL schema/RLS migrations.
- **CLOUD-LIB-05/07/08**: add typed auth + library services and refactor current contexts to dual local/cloud behavior with login-time merge.
- **CLOUD-LIB-06**: add auth route and account affordances in the header/sidebar.
- **CLOUD-LIB-09/10/11/12**: add progress tracking, history UI, home in-progress row, and watch-later resume from saved progress.
