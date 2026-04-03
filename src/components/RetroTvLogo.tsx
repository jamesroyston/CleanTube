"use client";

import Box from "@mui/material/Box";
import { keyframes, useTheme } from "@mui/material/styles";
import { useEffect, useState, useSyncExternalStore } from "react";

const VIEW_W = 64;
const VIEW_H = 72;

const drawLine = keyframes`
  to {
    stroke-dashoffset: 0;
  }
`;

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type RetroTvLogoProps = {
  size?: number;
  /** Repeat draw + glow cycle (e.g. home hero). */
  repeat?: boolean;
};

function RetroTvLogoInner({
  size,
  reducedMotion,
}: {
  size: number;
  reducedMotion: boolean;
}) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const [strokeDone, setStrokeDone] = useState(false);
  const drawComplete = reducedMotion || strokeDone;

  const glow =
    drawComplete && !reducedMotion
      ? `drop-shadow(0 0 ${Math.max(4, size * 0.12)}px ${accent})`
      : "none";
  const scale = size / VIEW_W;

  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        verticalAlign: "middle",
        color: accent,
        filter: glow,
        transition: reducedMotion ? undefined : "filter 0.45s ease-out 0.1s",
        "& .tv-ant-l": {
          strokeDasharray: 100,
          strokeDashoffset: reducedMotion ? 0 : 100,
          animation: reducedMotion
            ? "none"
            : `${drawLine} 0.35s ease-out forwards`,
        },
        "& .tv-ant-r": {
          strokeDasharray: 100,
          strokeDashoffset: reducedMotion ? 0 : 100,
          animation: reducedMotion
            ? "none"
            : `${drawLine} 0.35s ease-out 0.12s forwards`,
        },
        "& .tv-bezel": {
          strokeDasharray: 100,
          strokeDashoffset: reducedMotion ? 0 : 100,
          animation: reducedMotion
            ? "none"
            : `${drawLine} 0.55s ease-out 0.28s forwards`,
          fill: reducedMotion
            ? "rgba(0,0,0,0.08)"
            : drawComplete
              ? "rgba(0,0,0,0.08)"
              : "none",
          transition: reducedMotion ? undefined : "fill 0.4s ease-out",
        },
        "& .tv-screen": {
          strokeDasharray: 100,
          strokeDashoffset: reducedMotion ? 0 : 100,
          animation: reducedMotion
            ? "none"
            : `${drawLine} 0.45s ease-out 0.5s forwards`,
          fill: "currentColor",
          fillOpacity: reducedMotion ? 0.35 : drawComplete ? 0.35 : 0,
          transition: reducedMotion
            ? undefined
            : "fill-opacity 0.35s ease-out 0.05s",
        },
      }}
    >
      <Box
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        sx={{
          width: VIEW_W * scale,
          height: VIEW_H * scale,
          overflow: "visible",
        }}
      >
        <path
          className="tv-ant-l"
          d="M 24 8 L 32 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          pathLength={100}
        />
        <path
          className="tv-ant-r"
          d="M 40 8 L 32 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          pathLength={100}
        />
        <rect
          className="tv-bezel"
          x="10"
          y="20"
          width="44"
          height="38"
          rx="5"
          ry="5"
          stroke="currentColor"
          strokeWidth="2.2"
          pathLength={100}
        />
        <rect
          className="tv-screen"
          x="15"
          y="25"
          width="34"
          height="28"
          rx="2.5"
          ry="2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          pathLength={100}
          onAnimationEnd={() => setStrokeDone(true)}
        />
      </Box>
    </Box>
  );
}

export function RetroTvLogo({ size = 40, repeat = false }: RetroTvLogoProps) {
  const [cycle, setCycle] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (!repeat || reducedMotion) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), 3600);
    return () => window.clearInterval(id);
  }, [repeat, reducedMotion]);

  return (
    <RetroTvLogoInner key={cycle} size={size} reducedMotion={reducedMotion} />
  );
}
