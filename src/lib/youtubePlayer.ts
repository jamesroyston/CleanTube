import type { LiteYoutubeElement } from "@/types/lite-youtube-element";

/** True when the iframe is still in the document (player not destroyed). */
export function isYoutubePlayerAttached(
  player: YT.Player | null | undefined,
): player is YT.Player {
  if (!player) return false;
  try {
    const iframe = player.getIframe?.();
    return Boolean(iframe?.isConnected);
  } catch {
    return false;
  }
}

/**
 * Resolve YT.Player from lite-youtube after onReady; returns null if detached
 * or unavailable. Pass `timeoutMs` so a hung `getYTPlayer()` (iOS after the
 * page was backgrounded) cannot block forever.
 */
export async function getAttachedLiteYoutubePlayer(
  root: HTMLElement | null,
  timeoutMs = 0,
): Promise<YT.Player | null> {
  if (!root) return null;
  const el = root.querySelector("lite-youtube") as LiteYoutubeElement | null;
  if (!el || typeof el.getYTPlayer !== "function") return null;
  try {
    const pending = el.getYTPlayer();
    const player =
      timeoutMs > 0
        ? await Promise.race([
            pending,
            new Promise<null>((resolve) => {
              window.setTimeout(() => resolve(null), timeoutMs);
            }),
          ])
        : await pending;
    if (!player || !isYoutubePlayerAttached(player)) return null;
    return player;
  } catch {
    return null;
  }
}

/** Safe read of current time; returns undefined if player is not ready / attached. */
export function readPlayerCurrentTime(player: YT.Player): number | undefined {
  if (!isYoutubePlayerAttached(player)) return undefined;
  try {
    const t = player.getCurrentTime?.();
    return t != null && Number.isFinite(t) ? t : undefined;
  } catch {
    return undefined;
  }
}

/** Stop playback immediately (e.g. before client-side navigation). */
export function stopLiteYoutubePlayer(
  player: YT.Player | null | undefined,
): void {
  if (!player) return;
  try {
    if (isYoutubePlayerAttached(player)) {
      player.stopVideo();
    }
  } catch {
    /* ignore */
  }
}

/** Tear down the iframe player (call on watch-page unmount). */
export function destroyLiteYoutubePlayer(
  player: YT.Player | null | undefined,
): void {
  if (!player) return;
  try {
    player.destroy();
  } catch {
    /* ignore */
  }
}

/** Stop then destroy — single teardown for unmount. */
export function releaseLiteYoutubePlayer(
  player: YT.Player | null | undefined,
): void {
  stopLiteYoutubePlayer(player);
  destroyLiteYoutubePlayer(player);
}

/** Locate the <lite-youtube> element within (or as) a shell node. */
function findLiteYoutubeElement(
  root: HTMLElement | null,
): LiteYoutubeElement | null {
  if (!root) return null;
  if (root.matches?.("lite-youtube")) return root as LiteYoutubeElement;
  return root.querySelector("lite-youtube") as LiteYoutubeElement | null;
}

/**
 * True when the shell holds an <lite-youtube> that has already been activated.
 *
 * The App Router keeps the watch page's DOM in its client-side cache, so the
 * same custom element is reconnected when the user re-opens the same video.
 * Such a reused element still carries `lyt-activated` and a cached
 * `playerPromise` resolving to the player we destroyed on the previous unmount.
 * Trying to revive it in place races lite-youtube's async `activate()` (which
 * can spawn a duplicate iframe) and otherwise leaves only the poster thumbnail.
 * Callers should instead remount a fresh element so activation is clean.
 */
export function isLiteYoutubeElementActivated(root: HTMLElement | null): boolean {
  const el = findLiteYoutubeElement(root);
  return Boolean(el && el.classList.contains("lyt-activated"));
}

/** YouTube's IFrame API iframe sometimes omits PiP from `allow`. */
export function ensureYoutubeIframeAllowsPiP(player: YT.Player): void {
  if (!isYoutubePlayerAttached(player)) return;
  const iframe = player.getIframe?.();
  if (!iframe) return;
  const allow = iframe.allow ?? "";
  const extras = ["picture-in-picture", "fullscreen", "encrypted-media"];
  const missing = extras.filter((token) => !allow.includes(token));
  if (missing.length > 0) {
    iframe.allow = [allow, ...missing].filter(Boolean).join("; ");
  }
  iframe.allowFullscreen = true;
}

/** Safe read of duration; returns undefined if player is not ready / attached. */
export function readPlayerDuration(player: YT.Player): number | undefined {
  if (!isYoutubePlayerAttached(player)) return undefined;
  try {
    const d = player.getDuration?.();
    return d != null && Number.isFinite(d) ? d : undefined;
  } catch {
    return undefined;
  }
}
