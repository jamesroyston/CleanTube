# Auth Session Persistence

## Problem

Users were signed out unexpectedly while browsing. Common causes:

- `onAuthStateChange` treated any `session === null` as logout, including transient refresh races and multi-tab token rotation.
- Bootstrap used `getSession()` (cookie-only, unvalidated) instead of `getUser()`.
- OAuth callback used a server client that swallows `setAll` cookie errors in Server Components.
- Brief null sessions when multiple tabs refresh tokens at once.

## In-app changes

### Event-aware auth subscription

`subscribeToAuthChanges` in `src/lib/cloudLibrary/cloudStore.ts` now passes `AuthChangeEvent` plus `session` to listeners.

`CloudLibraryContext` only clears `user` / `session` on:

- Explicit `SIGNED_OUT` from Supabase, or
- `signOutUser()` (unchanged explicit logout path).

When `session` is non-null, state is updated (covers `TOKEN_REFRESHED`, `SIGNED_IN`, `INITIAL_SESSION`, `USER_UPDATED`, and other events that still carry a session).

When `session` is null on any other event, clearing is **debounced 300ms**. If a session returns within that window (e.g. another tab finished refresh), the user stays signed in. The app never calls `signOut()` automatically on errors.

### Bootstrap with `getUser()`

`getInitialSession` calls `supabase.auth.getUser()` first for a validated user. On network/offline failure it falls back to `getSession()` so a cached local session is not dropped immediately.

### OAuth callback cookies

`src/app/(auth)/auth/callback/route.ts` uses `createSupabaseRouteHandlerClient()` so `exchangeCodeForSession` always writes auth cookies (no swallowed `setAll` in Server Components).

### Shared cookie options

`src/utils/supabase/cookieOptions.ts` sets `secure` in production, `sameSite: 'lax'`, and `path: '/'`. Passed to `createBrowserClient` and all `createServerClient` helpers (server, route handler, middleware proxy).

### Visibility recovery

On `document.visibilitychange` when the tab becomes visible, the client calls `getUser()` and refreshes React session state after sleep/wake without waiting for a failed background refresh to surface as logout.

## Supabase Dashboard settings to verify

In **Authentication → Settings** (wording may vary by project):

| Setting | Recommendation |
|--------|----------------|
| **JWT expiry** | Default (3600s) is fine; very short values increase refresh churn. |
| **Refresh token rotation** | Keep enabled for security. |
| **Refresh token reuse interval** | If available, use a **longer** interval (e.g. 10s+) so a second tab reusing a just-rotated refresh token does not immediately invalidate the session. Enable reuse detection if offered. |

After changing dashboard settings, sign out and sign in once per browser profile so cookies pick up new behavior.

## Multi-tab note

With refresh token rotation, two tabs can refresh near the same time. One tab may briefly see `session === null` before the other tab’s cookies propagate. The 300ms debounce avoids treating that blip as logout. Keeping a single “primary” tab open during long sessions still reduces refresh contention.

## Explicit sign-out

`signOutUser()` still calls `supabase.auth.signOut()`, clears local library storage, and hydrates from local data. No change to intentional logout UX.
