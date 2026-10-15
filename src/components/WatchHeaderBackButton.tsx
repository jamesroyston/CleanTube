"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";

import type { WatchBackTarget } from "@/hooks/useWatchBackTarget";
import { stopActiveWatchPlayer } from "@/lib/watchPlayerLifecycle";

const TOUCH_TARGET_SX = {
  minWidth: 48,
  minHeight: 48,
  flexShrink: 0,
} as const;

export function WatchHeaderBackButton({ target }: { target: WatchBackTarget }) {
  return (
    <IconButton
      component={Link}
      href={target.href}
      prefetch
      scroll={false}
      aria-label={target.label}
      edge="start"
      onClick={() => stopActiveWatchPlayer()}
      sx={TOUCH_TARGET_SX}
    >
      <ArrowBackIcon />
    </IconButton>
  );
}
