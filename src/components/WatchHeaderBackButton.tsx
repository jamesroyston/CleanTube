"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import type { MouseEvent } from "react";

import type { WatchBackTarget } from "@/hooks/useWatchBackTarget";
import { stopActiveWatchPlayer } from "@/lib/watchPlayerLifecycle";

const TOUCH_TARGET_SX = {
  minWidth: 48,
  minHeight: 48,
  flexShrink: 0,
} as const;

function canGoBack(): boolean {
  const state = window.history.state as { idx?: number } | null;
  if (state && typeof state.idx === "number") return state.idx > 0;
  return window.history.length > 1;
}

export function WatchHeaderBackButton({ target }: { target: WatchBackTarget }) {
  return (
    <IconButton
      component={Link}
      href={target.href}
      prefetch
      scroll={false}
      aria-label={target.label}
      edge="start"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        stopActiveWatchPlayer();
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        if (!canGoBack()) return;
        event.preventDefault();
        window.history.back();
      }}
      sx={TOUCH_TARGET_SX}
    >
      <ArrowBackIcon />
    </IconButton>
  );
}
