# Compact layout (mobile bottom nav + scroll-reveal header)

## Overview

Browse and auth layouts share compact-viewport behavior via `src/hooks/useCompactViewport.ts` and split React contexts:

- **`SearchOverlayContext`** — opens the search dialog from `Header` / `MobileBottomNav` (stable, no scroll re-renders).
- **`HeaderScrollContext`** — scroll-reveal progress for narrow desktop windows only.

Product behavior for touch/PWA is gated by **`useMobileExperience()`** (`src/hooks/useMobileExperience.ts`), an alias of `useShowBottomNav()`.

## Bottom app bar

Shown when **viewport &lt; 900px** and **(touch-primary device or installed PWA)**.

- Top bar: logo only (`Header` with `showBottomNav`).
- Bottom bar: Home, Library, Search, Account (`MobileBottomNav`).

### Mobile information architecture

On touch/PWA (`useMobileExperience()`):

| Tab | Destination |
|-----|-------------|
| Home | `/` |
| Library | `/library` hub (History, Watch Later, saved channels, manage link) |
| Search | Search overlay (unchanged) |
| Account | `/account` (profile, auth, link to Settings) |

Dedicated routes:

- **`/settings`** — theme, watch-page toggles, maintenance, PWA install
- **`/library/manage`** — remove saved channels and pinned searches

Active tab highlighting uses `src/lib/mobileNavRoutes.ts` (library family: `/library`, `/history`, `/watch-later`; account family: `/account`, `/settings`, `/auth`).

The library **drawer** remains for **narrow desktop browser** compact mode only (`useCompactViewport()` && !`useShowBottomNav()`).

## SSR layout hint (no desktop flash)

`useMediaQuery` defaults to `false` on the server, which briefly painted desktop chrome on touch/PWA before hydration.

**Layer 1 — pre-paint bootstrap** (`src/lib/compactLayoutBootstrap.ts`):

- Blocking inline script in root `<head>` runs before body paint
- Sets `data-pwa-standalone`, `data-touch-primary`, `data-compact-viewport`, `data-mobile-experience` on `<html>`
- Detects `(display-mode: standalone)` and legacy iOS `navigator.standalone` on **first PWA launch** (no cookie required)
- `globals.css` hides `[data-desktop-shell]` and desktop header chrome when `data-mobile-experience="1"` or matching native `@media` rules

**Layer 2 — SSR cookie + UA** (`src/lib/compactLayoutHint.ts`):

- Cookie `cleantube-compact-layout-hint` (`ctm` flags) + UA fallback
- `RootLayout` sets matching `data-*` on `<html>` and passes `initialCompactLayoutHint` into `CompactLayoutProvider`
- Hooks merge server hint with bootstrap DOM flags (`mergeCompactLayoutHints`) for `useMediaQuery` `defaultMatches`
- Client updates the cookie when measured layout diverges (`setCompactLayoutHintAction`)

**Layer 3 — MUI `ssrMatchMedia`** (`src/lib/compactLayoutSsr.ts`):

- `createSsrMatchMedia(hint)` uses `css-mediaquery` with width **390px** when `mobileExperience` / `compactViewport`, else **1280px**
- Touch/PWA queries (`pointer: coarse`, `display-mode: standalone`) resolve from `hint.touchPrimary`
- Wired via `MuiUseMediaQuery.defaultProps` in `createAppTheme()`; `AppProviders` passes the same hint-derived factory on server and client

## iOS Safari / PWA priority

- **Viewport**: `viewportFit: "cover"` + `env(safe-area-inset-*)` on header, search overlay, bottom nav
- **Search overlay**: self-contained sheet on mobile experience; browse header and bottom nav hidden while open; hardware back via `history.pushState` / `popstate`; backdrop tap closes
- **Install UX**: iOS has no `beforeinstallprompt` — `PwaInstallButton` shows Share → Add to Home Screen instructions (`src/lib/pwaPlatform.ts`)
- **Standalone detection**: bootstrap + hooks use `(display-mode: standalone)` and `navigator.standalone`
- **Touch scrolling**: mobile `AppShell` uses document scroll (no nested `overflow: auto` under `100dvh`)
- **Height fallbacks**: `100dvh` with `-webkit-fill-available` / `100vh` on body, auth shell, search overlay
- **Manifest / icons**: `manifest.webmanifest`, `appleWebApp`, raster favicons in root `layout.tsx`

## Search overlay (mobile experience)

When `useMobileExperience()` / `showBottomNav` is active:

- Full-screen sheet with `env(safe-area-inset-top)` on the dialog paper (viewport-fit `cover` in root layout)
- Self-contained header: close icon (48px target), field, and **Cancel**; browse logo bar and bottom nav are hidden while open
- Hardware/back: `history.pushState` + `popstate` (unchanged)
- Backdrop tap closes the dialog

Narrow desktop compact windows keep the browse header and arrow-back close control.

## Scroll-reveal header

Shown when compact viewport, header “scrolls away” breakpoints apply, and bottom nav is **not** shown (narrow desktop browser).

Implemented in `ScrollRevealHeader.tsx`. Uses `position: fixed` + `translate3d` after ~80px scroll; `AppShell` reserves measured header height while overlay is active to avoid layout jump.

## Files

| File | Role |
|------|------|
| `lib/compactLayoutHint.ts` | Cookie + UA SSR hints |
| `lib/compactLayoutBootstrap.ts` | Pre-paint script + DOM flags |
| `lib/compactLayoutSsr.ts` | MUI `ssrMatchMedia` from hint |
| `lib/pwaPlatform.ts` | iOS / standalone PWA detection |
| `useCompactViewport.ts` | Media queries + policy hooks |
| `useMobileExperience.ts` | Touch/PWA product surface gate |
| `lib/mobileNavRoutes.ts` | Bottom nav active tab mapping |
| `lib/compactLayout.ts` | Bottom nav height constant |
| `CompactLayoutChrome.tsx` | Mounts scroll-reveal + optional bottom nav |
| `ScrollRevealHeader.tsx` | Scroll listener / idle hide |
| `MobileBottomNav.tsx` | Bottom `AppBar` + route navigation |
| `LibraryHubMobile.tsx` | Mobile `/library` hub |
| `AccountPageClient.tsx` | `/account` page |
| `SettingsPageClient.tsx` | `/settings` page |
| `AuthMobileLayout.tsx` | Auth shell |
| `AppShell.tsx` | Browse shell |
