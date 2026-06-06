import type { LiteYoutubeElement } from "@/types/lite-youtube-element";

/** True when the iframe is still in the document (player not destroyed). */
export function isYoutubePlayerAttached(player: YT.Player | null | undefined): boolean {
  if (!player) return false;
  try {
    const iframe = player.getIframe?.();
    return Boolean(iframe?.isConnected);
  } catch {
    return false;
  }
}

/**
 * Resolve YT.Player from lite-youtube after onReady; returns null if detached or unavailable.
 */
export async function getAttachedLiteYoutubePlayer(
  root: HTMLElement | null,
): Promise<YT.Player | null> {
  if (!root) return null;
  const el = root.querySelector("lite-youtube") as LiteYoutubeElement | null;
  if (!el || typeof el.getYTPlayer !== "function") return null;
  try {
    const player = await el.getYTPlayer();
    if (!isYoutubePlayerAttached(player)) return null;
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
