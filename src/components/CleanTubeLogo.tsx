"use client";

import Box from "@mui/material/Box";
import { keyframes, useTheme } from "@mui/material/styles";
import { useEffect, useState, useSyncExternalStore } from "react";

const VIEW = 64;

const wavePulse = keyframes`
  0%, 100% { transform: translateX(0); opacity: 0.85; }
  50% { transform: translateX(1px); opacity: 1; }
`;

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type CleanTubeLogoProps = {
  size?: number;
  /** Repeat subtle wave motion (e.g. home hero). */
  repeat?: boolean;
};

function CleanTubeLogoInner({
  size,
  reducedMotion,
  animate,
}: {
  size: number;
  reducedMotion: boolean;
  animate: boolean;
}) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const scale = size / VIEW;

  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        verticalAlign: "middle",
        color: accent,
        ...(animate && !reducedMotion
          ? {
              "& .ct-wave": {
                animation: `${wavePulse} 2.8s ease-in-out infinite`,
              },
              "& .ct-wave-delay": {
                animation: `${wavePulse} 2.8s ease-in-out 0.35s infinite`,
              },
            }
          : {}),
      }}
    >
      <Box
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        sx={{
          width: VIEW * scale,
          height: VIEW * scale,
          overflow: "visible",
        }}
      >
        <path
          className="ct-wave"
          d="M 6 42 C 14 36, 22 48, 30 42 S 46 36, 54 42"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity={0.45}
        />
        <path
          className="ct-wave-delay"
          d="M 8 48 C 16 44, 24 52, 32 48 S 48 44, 56 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d="M 24 14 L 24 38 L 42 26 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </Box>
    </Box>
  );
}

export function CleanTubeLogo({ size = 40, repeat = false }: CleanTubeLogoProps) {
  const [cycle, setCycle] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (!repeat || reducedMotion) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), 4000);
    return () => window.clearInterval(id);
  }, [repeat, reducedMotion]);

  return (
    <CleanTubeLogoInner
      key={cycle}
      size={size}
      reducedMotion={reducedMotion}
      animate={repeat}
    />
  );
}
