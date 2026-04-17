"use client";

import Box from "@mui/material/Box";

export function WatchProgressBar({
  positionSeconds,
  durationSeconds,
}: {
  positionSeconds: number;
  durationSeconds?: number;
}) {
  const percent =
    durationSeconds && durationSeconds > 0
      ? Math.max(0, Math.min(100, (positionSeconds / durationSeconds) * 100))
      : undefined;

  if (percent == null || percent <= 0) return null;

  return (
    <Box
      sx={{
        mt: 0.5,
        height: 4,
        borderRadius: 999,
        overflow: "hidden",
        bgcolor: "action.hover",
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
