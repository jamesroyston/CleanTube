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

---

## EPIC: Cloud library, auth, watch progress (Supabase) — not yet implemented

**Goal:** Persist saved library (channels, watch later, and later watch progress / history) across devices. Prefer **Supabase** (Auth + Postgres + RLS); **Vercel Postgres** was considered as an alternative if we ever want DB-only without Supabase’s auth/session helpers.

**Auth (expected):** Sign-up, login, reset password; optionally passkeys and/or OAuth later. Anonymous users must still work: **session/local storage** for in-browser-only use when not signed in.

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
