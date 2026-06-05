"use client";

import type { MutableRefObject, RefObject } from "react";
import { useEffect } from "react";

import {
  adjustVolume,
  resolveLiteYoutubePlayer,
  SEEK_STEP_SEC,
  seekRelative,
  seekToTimelineFraction,
  toggleCaptions,
  toggleFullscreen,
  toggleMute,
  togglePlayPause,
  VOLUME_STEP,
} from "@/lib/youtubePlayerControls";
import { isYoutubePlayerAttached } from "@/lib/youtubePlayer";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Document-level shortcuts → YouTube IFrame API (requires lite-youtube `js-api` + `getYTPlayer`).
 */
export function useGlobalYoutubeShortcuts(
  containerRef: RefObject<HTMLElement | null>,
  videoId: string,
  enabled = true,
  playerApiReadyRef?: MutableRefObject<boolean>,
): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    let playerCache: YT.Player | null = null;

    async function getPlayer(): Promise<YT.Player | null> {
      if (playerApiReadyRef && !playerApiReadyRef.current) return null;
      if (playerCache && isYoutubePlayerAttached(playerCache)) {
        return playerCache;
      }
      playerCache = null;
      const p = await resolveLiteYoutubePlayer(containerRef.current);
      if (cancelled || !p) return null;
      playerCache = p;
      return p;
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
    // playerApiReadyRef is a ref — read .current inside the effect; do not list it here
  }, [containerRef, videoId, enabled]);
}
