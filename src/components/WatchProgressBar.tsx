"use client";

import Box from "@mui/material/Box";

export function WatchProgressBar({
  positionSeconds,
  durationSeconds,
  variant = "default",
  forceFull = false,
}: {
  positionSeconds: number;
  durationSeconds?: number;
  /** `overlay` — full-width bar on thumbnail bottom (no margin/radius). */
  variant?: "default" | "overlay";
  /** When true, render a full-width bar (e.g. completed videos). */
  forceFull?: boolean;
}) {
  const percent = forceFull
    ? 100
    : durationSeconds && durationSeconds > 0
      ? Math.max(0, Math.min(100, (positionSeconds / durationSeconds) * 100))
      : undefined;

  if (!forceFull && (percent == null || percent <= 0)) return null;

  const isOverlay = variant === "overlay";

  return (
    <Box
      sx={{
        ...(isOverlay
          ? { height: 3, borderRadius: 0, bgcolor: "rgba(255,255,255,0.35)" }
          : { mt: 0.5, height: 4, borderRadius: 999, bgcolor: "action.hover" }),
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${percent}%`,
          height: "100%",
          bgcolor: "primary.main",
        }}
      />
    </Box>
  );
}
