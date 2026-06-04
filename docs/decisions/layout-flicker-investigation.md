# Layout flicker investigation

## Context

Users report occasional **sizing flicker** on browse pages, especially `/watch/[id]`. Prior passes flagged five suspects. This document records severity, observed behavior, fixes applied in this pass, and deferred work.

## Suspects

### 1. `WatchExperienceClient` — deferred player mount (`progressResolvable`)

**Mechanism:** The watch player is not mounted until `progressResolvable` is true: URL `?t=` / `?start=`, or local library hydrated plus auth/cloud sync settled. Until then, a static 16:9 `Box` placeholder is shown; when resolved, `LiteYouTubeEmbed` mounts.

**Severity:** **High** on signed-in + cloud-sync paths (extra frame(s) of placeholder). **Low** when `?t=` is present or user is anonymous with fast local hydration.

**Fix warranted?** **Partially deferred.** Correct resume position requires not committing `startSeconds` until cloud/local state is ready (`useCommittedStartSeconds` locks on first mount). Removing the gate without redesign risks starting at 0 then jumping.

**Applied:** Preload `lite-youtube-embed` while waiting (see #2) so the post-resolve mount does not add a second skeleton phase.

**Future:** SSR/pass server-known resume into `startSeconds`; or mount player immediately with a “locked until resolved” start param API; or show one combined loading state instead of placeholder → embed skeleton.

---

### 2. `LiteYouTubeEmbed` — skeleton → `ready` transition

**Mechanism:** `ready` starts `false`; dynamic `import("lite-youtube-embed/...")` runs in `useEffect`. Until settled, a 16:9 `action.hover` skeleton renders, then swaps to `<lite-youtube>`.

**Severity:** **Medium** alone; **High** when stacked after #1 (double gray flash).

**Fix warranted?** **Yes — low risk.**

**Applied:**

- Module-level preload helper `preloadLiteYoutubeEmbed()`.
- `WatchExperienceClient` calls preload on mount (including while `progressResolvable` is false).
- `LiteYouTubeEmbed` initializes `ready` from module settled state so a preloaded module skips the skeleton on first paint.

**Future:** App-level preload in browse layout; consider inlining critical lite-yt CSS to avoid style pop.

---

### 3. `AppShell` — `ResizeObserver` on `Header` → `headerInsetPx` spacer

**Mechanism:** Desktop (`md+`) renders a spacer `Box` with `height: headerInsetPx` before the fixed `Header`. State defaults to **72px**; `useLayoutEffect` + `ResizeObserver` measure `AppBar` bottom and update (often ~80px: Toolbar `minHeight` 64 + `py: 1` × 2).

**Severity:** **Medium** on desktop first paint — main content jumps ~8px when measure runs. On compact viewports, a spacer is rendered only while scroll-reveal overlay is active (see [compact-layout.md](./compact-layout.md)); touch/PWA layouts use a bottom nav instead.

**Fix warranted?** **Yes — low risk.**

**Applied:** Default `headerInsetPx` set to **80** (`DESKTOP_HEADER_INSET_FALLBACK_PX`), matching `Header` Toolbar `minHeight: 64` + `py: 1` on `sm+`. Safe-area still corrected on measure.

**Future:** Pure CSS spacer (`padding-top` on main from measured custom property) to avoid React state; or SSR hint for safe-area.

---

### 4. Up-next toggle — Grid `12` ↔ `8` at `lg+`

**Mechanism:** Main column uses `Grid size={{ xs: 12, lg: upNextVisible ? 8 : 12 }}`; sidebar column mounts only when `upNextVisible`.

**Severity:** **Low** for flicker — intentional layout change when the user toggles Up next in settings. Cookie + SSR `initialWatchUpNextVisible` keep first paint aligned with preference.

**Fix warranted?** **No** unless we want a fixed main column width regardless of setting (product change).

**Future:** None unless UX asks for non-resizing main column.

---

### 5. `WatchNextSidebar` — `null` until async fetch

**Mechanism:** `videos.length === 0` → component returns `null`. With Up next enabled, the right column exists but has no height until client fetch (or SSR list) populates → **large vertical shift** beside the player.

**Severity:** **Medium** when Up next is on and SSR did not pass `watchNextInitial` (cookie off at request time, or empty feed).

**Fix warranted?** **Yes — low risk.**

**Applied:** When `videos.length === 0`, render “Up next” heading + three skeleton rows (fixed approximate card height) instead of `null`.

**Future:** SSR always when cookie on (already done on watch page); optional stale-while-revalidate from cache.

---

## Summary table

| Suspect | Severity | Fixed this pass | Notes |
|--------|----------|-----------------|-------|
| `progressResolvable` player gate | High (signed-in) | Partial (preload only) | Needs resume/SSR design for full fix |
| `LiteYouTubeEmbed` ready | Medium–High | Yes | Preload + settled initial `ready` |
| `AppShell` header inset | Medium (desktop) | Yes | 72 → 80 default |
| Grid 8/12 toggle | Low | No | Intentional UX |
| `WatchNextSidebar` empty | Medium | Yes | Skeleton shell |

## Files touched

- `docs/decisions/layout-flicker-investigation.md` (this doc)
- `src/components/AppShell.tsx`
- `src/components/LiteYouTubeEmbed.tsx`
- `src/components/WatchExperienceClient.tsx`
- `src/components/WatchNextSidebar.tsx`

## Verification

Manual:

1. Desktop browse → watch: confirm no ~8px jump under fixed header on first load.
2. Watch with Up next on, empty sidebar: column keeps height; skeletons then cards.
3. Signed-in watch without `?t=`: at most one player-area skeleton phase if preload wins race; otherwise still one gate, not two identical skeletons in sequence.

Automated: no new tests (visual/layout behavior).
