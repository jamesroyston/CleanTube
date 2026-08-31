import Box from "@mui/material/Box";

/**
 * TEMPORARY debug aid for the landscape work: shows which deploy is loaded so a
 * cached PWA can be told apart from a fresh one. Bump `ITERATION` with each build
 * that is meant to be tested. Remove this component and its mount in `AppShell`,
 * plus `NEXT_PUBLIC_BUILD_SHA` in `next.config.ts`, once landscape is signed off.
 */
const ITERATION = 7;
const NOTE = "right gutter 40";

export function BuildStampDebug() {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown";

  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        top: "env(safe-area-inset-top, 0px)",
        left: "env(safe-area-inset-left, 0px)",
        px: 0.75,
        py: 0.25,
        pointerEvents: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.3,
        fontWeight: 700,
        color: "#ff4d4f",
        bgcolor: "rgba(0, 0, 0, 0.6)",
        borderBottomRightRadius: 4,
        whiteSpace: "nowrap",
        zIndex: 2147483647,
      }}
    >
      {`#${ITERATION} ${sha} · ${NOTE}`}
    </Box>
  );
}
