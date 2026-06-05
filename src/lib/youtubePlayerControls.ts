import {
  getAttachedLiteYoutubePlayer,
  isYoutubePlayerAttached,
  readPlayerCurrentTime,
  readPlayerDuration,
} from "@/lib/youtubePlayer";

export const SEEK_STEP_SEC = 10;
export const YT_PLAYING = 1;

/** IFrame API caption / module helpers not on base `YT.Player` typings. */
export type PlayerExtended = YT.Player & {
  getOption?: (module: string, option: string) => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
  loadModule?: (module: string) => void;
};

export async function resolveLiteYoutubePlayer(
  container: HTMLElement | null,
): Promise<YT.Player | null> {
  return getAttachedLiteYoutubePlayer(container);
}

export function isPlayerPlaying(player: YT.Player): boolean {
  if (!isYoutubePlayerAttached(player)) return false;
  try {
    return player.getPlayerState() === YT_PLAYING;
  } catch {
    return false;
  }
}

export async function togglePlayPause(player: YT.Player): Promise<void> {
  if (!isYoutubePlayerAttached(player)) return;
  try {
    const s = player.getPlayerState();
    if (s === YT_PLAYING) player.pauseVideo();
    else player.playVideo();
  } catch {
    /* not ready */
  }
}

export async function seekRelative(
  player: YT.Player,
  deltaSec: number,
): Promise<void> {
  if (!isYoutubePlayerAttached(player)) return;
  const t = readPlayerCurrentTime(player) ?? 0;
  const d = readPlayerDuration(player);
  const max = d && d > 0 ? d : t + Math.abs(deltaSec);
  const next = Math.min(Math.max(0, t + deltaSec), max);
  try {
    player.seekTo(next, true);
  } catch {
    /* not ready */
  }
}

export async function seekToTimelineFraction(
  player: YT.Player,
  digit0to9: number,
): Promise<void> {
  if (!isYoutubePlayerAttached(player)) return;
  const d = readPlayerDuration(player);
  if (!d || d <= 0) return;
  const frac = digit0to9 === 0 ? 0 : digit0to9 / 10;
  try {
    player.seekTo(Math.floor(frac * d), true);
  } catch {
    /* not ready */
  }
}

export function readPlayerVolume(player: YT.Player): number {
  if (!isYoutubePlayerAttached(player)) return 100;
  try {
    if (player.isMuted()) return 0;
    const v = player.getVolume?.();
    return v != null && Number.isFinite(v) ? Math.round(v) : 100;
  } catch {
    return 100;
  }
}

/** App volume is always 100%; loudness is controlled via device hardware keys. */
export function ensurePlayerVolume100(player: YT.Player): void {
  if (!isYoutubePlayerAttached(player)) return;
  try {
    player.setVolume(100);
  } catch {
    /* not ready */
  }
}

export function setPlayerVolume(player: YT.Player, volume: number): void {
  if (!isYoutubePlayerAttached(player)) return;
  const next = Math.min(100, Math.max(0, Math.round(volume)));
  try {
    if (next === 0) {
      player.mute();
      return;
    }
    if (player.isMuted()) player.unMute();
    player.setVolume(next);
  } catch {
    /* not ready */
  }
}

export async function toggleMute(player: YT.Player): Promise<void> {
  if (!isYoutubePlayerAttached(player)) return;
  try {
    if (player.isMuted()) {
      player.unMute();
      player.setVolume(100);
    } else {
      player.mute();
    }
  } catch {
    /* not ready */
  }
}

/**
 * YouTube exposes captions under different module names depending on the player
 * build ("captions" for the HTML5 player, "cc" for the legacy one). Try both so
 * the toggle works regardless of which the embed is using.
 */
const CAPTION_MODULES = ["captions", "cc"] as const;

type CaptionTrack = { languageCode?: string } | null | undefined;

function readActiveCaptionModule(
  p: PlayerExtended,
): { moduleName: string; track: CaptionTrack } | null {
  for (const moduleName of CAPTION_MODULES) {
    try {
      const track = p.getOption?.(moduleName, "track") as CaptionTrack;
      if (track && typeof track === "object") return { moduleName, track };
    } catch {
      /* try next module */
    }
  }
  return null;
}

function loadCaptionModules(p: PlayerExtended): void {
  for (const moduleName of CAPTION_MODULES) {
    try {
      p.loadModule?.(moduleName);
    } catch {
      /* ignore */
    }
  }
}

export function primeCaptionsModule(player: YT.Player): void {
  if (!isYoutubePlayerAttached(player)) return;
  loadCaptionModules(player as PlayerExtended);
}

export async function toggleCaptions(player: YT.Player): Promise<void> {
  if (!isYoutubePlayerAttached(player)) return;
  const p = player as PlayerExtended;

  loadCaptionModules(p);

  if (captionsEnabled(player)) {
    for (const moduleName of CAPTION_MODULES) {
      try {
        p.setOption?.(moduleName, "track", {});
      } catch {
        /* ignore */
      }
    }
    return;
  }

  let targetModule = "captions";
  let lang = "en";
  for (const moduleName of CAPTION_MODULES) {
    try {
      const list = p.getOption?.(moduleName, "tracklist") as
        | { languageCode?: string }[]
        | undefined;
      if (Array.isArray(list) && list.length > 0 && list[0]?.languageCode) {
        targetModule = moduleName;
        lang = list[0].languageCode;
        break;
      }
    } catch {
      /* try next module */
    }
  }

  try {
    p.setOption?.(targetModule, "track", { languageCode: lang });
  } catch {
    /* ignore */
  }
}

export function captionsEnabled(player: YT.Player): boolean {
  const active = readActiveCaptionModule(player as PlayerExtended);
  return Boolean(active?.track && active.track.languageCode);
}

const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  hd2160: "2160p",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
};

export function formatPlaybackQuality(quality: string): string {
  return QUALITY_LABELS[quality] ?? quality;
}

export function readAvailableQualities(player: YT.Player): string[] {
  if (!isYoutubePlayerAttached(player)) return [];
  try {
    const levels = player.getAvailableQualityLevels?.() ?? [];
    return levels.filter((q) => Boolean(q));
  } catch {
    return [];
  }
}

export function readPlaybackQuality(player: YT.Player): string {
  if (!isYoutubePlayerAttached(player)) return "auto";
  try {
    return player.getPlaybackQuality?.() ?? "auto";
  } catch {
    return "auto";
  }
}

export function setPlaybackQuality(player: YT.Player, quality: string): void {
  if (!isYoutubePlayerAttached(player)) return;
  try {
    player.setPlaybackQuality?.(quality as YT.SuggestedVideoQuality);
  } catch {
    /* not ready */
  }
}

export async function toggleFullscreen(player: YT.Player): Promise<void> {
  if (!isYoutubePlayerAttached(player)) return;
  const iframe = player.getIframe?.();
  if (!iframe) return;
  try {
    if (document.fullscreenElement === iframe) {
      await document.exitFullscreen();
    } else {
      await iframe.requestFullscreen();
    }
  } catch {
    /* ignore */
  }
}

export function buildYoutubeWatchUrl(
  videoId: string,
  currentSeconds?: number,
): string {
  const base = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  if (currentSeconds != null && currentSeconds > 0) {
    return `${base}&t=${Math.floor(currentSeconds)}`;
  }
  return base;
}
