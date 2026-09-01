"use client";

import Box from "@mui/material/Box";

/**
 * TEMPORARY debug aid for the landscape work: shows which deploy is loaded so a
 * cached PWA can be told apart from a fresh one. Bump `ITERATION` with each build
 * that is meant to be tested. Remove this component and its mount in `AppShell`,
 * plus `NEXT_PUBLIC_BUILD_SHA` in `next.config.ts`, once landscape is signed off.
 */
const ITERATION = 21;

export function BuildStampDebug() {
  const sha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "local").slice(0, 7);

  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        top: "auto",
        left: "auto",
        bottom: 0,
        right: 0,
        px: 0.5,
        py: 0.125,
        pointerEvents: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 9,
        lineHeight: 1.2,
        fontWeight: 700,
        color: "#ff4d4f",
        bgcolor: "rgba(0, 0, 0, 0.55)",
        zIndex: 2147483647,
      }}
    >
      {`${sha} #${ITERATION}`}
    </Box>
  );
}
