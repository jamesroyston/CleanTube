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

## Scroll-reveal header

Shown when compact viewport, header “scrolls away” breakpoints apply, and bottom nav is **not** shown (narrow desktop browser).

Implemented in `ScrollRevealHeader.tsx`. Uses `position: fixed` + `translate3d` after ~80px scroll; `AppShell` reserves measured header height while overlay is active to avoid layout jump.

## Files

| File | Role |
|------|------|
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
