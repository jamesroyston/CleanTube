"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

import type { LiteYoutubeElement } from "@/types/lite-youtube-element";

const SEEK_STEP_SEC = 10;
const VOLUME_STEP = 5;
const YT_PLAYING = 1;

/** IFrame API caption / module helpers not on base `YT.Player` typings. */
type PlayerExtended = YT.Player & {
  getOption?: (module: string, option: string) => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
  loadModule?: (module: string) => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function findLitePlayerRoot(ref: RefObject<HTMLElement | null>): LiteYoutubeElement | null {
  const root = ref.current;
  if (!root) return null;
  const el = root.querySelector("lite-youtube");
  if (!el) return null;
  return el as LiteYoutubeElement;
}

async function toggleFullscreen(player: YT.Player) {
  const iframe = player.getIframe?.();
  if (!iframe) return;
  try {
    if (document.fullscreenElement === iframe) {
      await document.exitFullscreen();
    } else {
      await iframe.requestFullscreen();
    }
  } catch {
    /* ignore — policy or unsupported */
  }
}

async function seekToTimelineFraction(player: YT.Player, digit0to9: number) {
  const d = player.getDuration?.();
  if (!d || !Number.isFinite(d) || d <= 0) return;
  const frac = digit0to9 === 0 ? 0 : digit0to9 / 10;
  player.seekTo(Math.floor(frac * d), true);
}

function adjustVolume(player: YT.Player, delta: number) {
  if (delta > 0 && player.isMuted()) player.unMute();
  const current = player.getVolume?.();
  const v = current == null || !Number.isFinite(current) ? 100 : current;
  const next = Math.min(100, Math.max(0, Math.round(v + delta)));
  player.setVolume(next);
  if (next === 0) player.mute();
}

/**
 * Document-level shortcuts → YouTube IFrame API (requires lite-youtube `js-api` + `getYTPlayer`).
 */
export function useGlobalYoutubeShortcuts(
  containerRef: RefObject<HTMLElement | null>,
  videoId: string,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    let playerCache: YT.Player | null = null;

    async function getPlayer(): Promise<YT.Player | null> {
      if (playerCache) return playerCache;
      const el = findLitePlayerRoot(containerRef);
      if (!el || typeof el.getYTPlayer !== "function") return null;
      try {
        const p = await el.getYTPlayer();
        if (cancelled || !p) return null;
        playerCache = p;
        return p;
      } catch {
        return null;
      }
    }

    async function togglePlayPause(player: YT.Player) {
      const s = player.getPlayerState();
      if (s === YT_PLAYING) player.pauseVideo();
      else player.playVideo();
    }

    async function seekRelative(player: YT.Player, deltaSec: number) {
      const t = player.getCurrentTime?.() ?? 0;
      const d = player.getDuration?.();
      const max = d && Number.isFinite(d) ? d : t + Math.abs(deltaSec);
      const next = Math.min(Math.max(0, t + deltaSec), max);
      player.seekTo(next, true);
    }

    async function toggleMute(player: YT.Player) {
      if (player.isMuted()) {
        player.unMute();
        if ((player.getVolume?.() ?? 0) === 0) player.setVolume(100);
      } else {
        player.mute();
      }
    }

    /** Captions: best-effort; embed / video may not expose tracks. */
    async function toggleCaptions(player: YT.Player) {
      const p = player as PlayerExtended;
      try {
        const cur = p.getOption?.("captions", "track") as
          | { languageCode?: string }
          | null
          | undefined;
        if (cur && typeof cur === "object" && cur.languageCode) {
          p.setOption?.("captions", "track", {});
          return;
        }
        p.loadModule?.("captions");
        const list = p.getOption?.("captions", "tracklist") as
          | { languageCode: string }[]
          | undefined;
        const lang =
          (Array.isArray(list) && list[0]?.languageCode) || "en";
        p.setOption?.("captions", "track", { languageCode: lang });
      } catch {
        /* ignore */
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (cancelled || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const keyLower = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (keyLower === "f") {
        e.preventDefault();
        void (async () => {
          const player = await getPlayer();
          if (!player || cancelled) return;
          await toggleFullscreen(player);
        })();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const digit = parseInt(e.key, 10);
        void (async () => {
          const player = await getPlayer();
          if (!player || cancelled) return;
          await seekToTimelineFraction(player, digit);
        })();
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.key === "ArrowUp" ? VOLUME_STEP : -VOLUME_STEP;
        void (async () => {
          const player = await getPlayer();
          if (!player || cancelled) return;
          adjustVolume(player, delta);
        })();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -SEEK_STEP_SEC : SEEK_STEP_SEC;
        void (async () => {
          const player = await getPlayer();
          if (!player || cancelled) return;
          await seekRelative(player, delta);
        })();
        return;
      }

      if (e.repeat && (e.key === " " || keyLower === "k")) return;

      const mapsMediaShortcut =
        keyLower === "j" ||
        keyLower === "l" ||
        keyLower === "k" ||
        keyLower === "m" ||
        keyLower === "c" ||
        e.key === " ";

      if (!mapsMediaShortcut) return;

      e.preventDefault();

      void (async () => {
        const player = await getPlayer();
        if (!player || cancelled) return;

        if (keyLower === "j") {
          await seekRelative(player, -SEEK_STEP_SEC);
          return;
        }
        if (keyLower === "l") {
          await seekRelative(player, SEEK_STEP_SEC);
          return;
        }
        if (keyLower === "k" || e.key === " ") {
          await togglePlayPause(player);
          return;
        }
        if (keyLower === "m") {
          await toggleMute(player);
          return;
        }
        if (keyLower === "c") {
          await toggleCaptions(player);
        }
      })();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      playerCache = null;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [containerRef, videoId, enabled]);
}
