"use client";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

const VIEW = 64;

export type CleanTubeLogoVariant =
  | "wave"
  | "ring"
  | "minimal"
  | "lanes";

export type CleanTubeLogoMarkProps = {
  size?: number;
  variant?: CleanTubeLogoVariant;
  /** Subtle wave motion classes (wave variant only). */
  animate?: boolean;
  reducedMotion?: boolean;
};

export function CleanTubeLogoMark({
  size = 40,
  variant = "wave",
  animate = false,
  reducedMotion = false,
}: CleanTubeLogoMarkProps) {
  const scale = size / VIEW;
  const motion =
    animate && !reducedMotion && variant === "wave"
      ? {
          "& .ct-wave": {
            animation: "ct-wave-pulse 2.8s ease-in-out infinite",
          },
          "& .ct-wave-delay": {
            animation: "ct-wave-pulse 2.8s ease-in-out 0.35s infinite",
          },
          "@keyframes ct-wave-pulse": {
            "0%, 100%": { transform: "translateX(0)", opacity: 0.85 },
            "50%": { transform: "translateX(1px)", opacity: 1 },
          },
        }
      : {};

  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        verticalAlign: "middle",
        color: "currentColor",
        ...motion,
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
        {variant === "wave" ? <WaveMark /> : null}
        {variant === "ring" ? <RingMark /> : null}
        {variant === "minimal" ? <MinimalMark /> : null}
        {variant === "lanes" ? <LanesMark /> : null}
      </Box>
    </Box>
  );
}

/** Current production mark: play + flowing waves. */
function WaveMark() {
  return (
    <>
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
    </>
  );
}

/** Play inside a soft ring — app-icon friendly. */
function RingMark() {
  return (
    <>
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity={0.35}
      />
      <path
        d="M 26 20 L 26 44 L 44 32 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Single bold play — maximum legibility at small sizes. */
function MinimalMark() {
  return (
    <path
      d="M 22 16 L 22 48 L 48 32 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );
}

/** Feed lanes + play dot — “clean timeline” metaphor. */
function LanesMark() {
  const theme = useTheme();
  const playCut =
    theme.palette.mode === "dark" ? theme.palette.primary.contrastText : "#FFFFFF";

  return (
    <>
      <rect x="10" y="18" width="44" height="5" rx="2.5" fill="currentColor" opacity={0.28} />
      <rect x="10" y="29" width="36" height="5" rx="2.5" fill="currentColor" opacity={0.4} />
      <rect x="10" y="40" width="28" height="5" rx="2.5" fill="currentColor" opacity={0.55} />
      <circle cx="48" cy="48" r="9" fill="currentColor" />
      <path d="M 45 44 L 45 52 L 52 48 Z" fill={playCut} />
    </>
  );
}

export const LOGO_VARIANT_LABELS: Record<
  CleanTubeLogoVariant,
  { title: string; blurb: string }
> = {
  wave: {
    title: "Wave (current)",
    blurb: "Play + calm waves — used in the header today.",
  },
  ring: {
    title: "Ring",
    blurb: "Contained play button; works well as a home-screen icon.",
  },
  minimal: {
    title: "Minimal",
    blurb: "Bold play only; clearest at 24px.",
  },
  lanes: {
    title: "Lanes",
    blurb: "Feed stripes + play; emphasizes a clean timeline.",
  },
};
