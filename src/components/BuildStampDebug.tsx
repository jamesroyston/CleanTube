"use client";

import Box from "@mui/material/Box";

/**
 * TEMPORARY debug aid for the landscape work: shows which deploy is loaded so a
 * cached PWA can be told apart from a fresh one. Bump `ITERATION` with each build
 * that is meant to be tested. Remove this component and its mount in the landscape
 * rail, plus `NEXT_PUBLIC_BUILD_SHA` in `next.config.ts`, once landscape is signed off.
 */
const ITERATION = 27;

export function BuildStampDebug() {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "local";

  return (
    <Box
      aria-hidden
      sx={{
        mt: "auto",
        flexShrink: 0,
        width: "100%",
        px: 0.25,
        py: 0.5,
        pointerEvents: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 8,
        lineHeight: 1.15,
        fontWeight: 700,
        color: "#ff4d4f",
        textAlign: "center",
        wordBreak: "break-all",
      }}
    >
      {sha}
      <Box component="span" sx={{ display: "block" }}>
        {ITERATION}
      </Box>
    </Box>
  );
}
