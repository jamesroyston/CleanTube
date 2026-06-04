# Compact layout (mobile bottom nav + scroll-reveal header)

## Overview

Browse and auth layouts share compact-viewport behavior via `src/hooks/useCompactViewport.ts` and split React contexts:

- **`SearchOverlayContext`** — opens the search dialog from `Header` / `MobileBottomNav` (stable, no scroll re-renders).
- **`HeaderScrollContext`** — scroll-reveal progress for narrow desktop windows only.

## Bottom app bar

Shown when **viewport &lt; 900px** and **(touch-primary device or installed PWA)**.

- Top bar: logo only (`Header` with `showBottomNav`).
- Bottom bar: Home, Library, Search, Account (`MobileBottomNav`).

## Scroll-reveal header

Shown when compact viewport, header “scrolls away” breakpoints apply, and bottom nav is **not** shown (narrow desktop browser).

Implemented in `ScrollRevealHeader.tsx`. Uses `position: fixed` + `translate3d` after ~80px scroll; `AppShell` reserves measured header height while overlay is active to avoid layout jump.

## Files

| File | Role |
|------|------|
| `useCompactViewport.ts` | Media queries + policy hooks |
| `lib/compactLayout.ts` | Bottom nav height constant |
| `CompactLayoutChrome.tsx` | Mounts scroll-reveal + optional bottom nav |
| `ScrollRevealHeader.tsx` | Scroll listener / idle hide |
| `MobileBottomNav.tsx` | Bottom `AppBar` + navigation |
| `AuthMobileLayout.tsx` | Auth shell |
| `AppShell.tsx` | Browse shell |
