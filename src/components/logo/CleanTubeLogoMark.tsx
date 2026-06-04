"use client";

import Box from "@mui/material/Box";

const VIEW = 64;

export type CleanTubeLogoVariant =
  | "wave"
  | "dawn"
  | "leaf"
  | "ripple"
  | "horizon";

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
        {variant === "dawn" ? <DawnMark /> : null}
        {variant === "leaf" ? <LeafMark /> : null}
        {variant === "ripple" ? <RippleMark /> : null}
        {variant === "horizon" ? <HorizonMark /> : null}
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

/** Soft sunrise arc — calm, hopeful start to watching. */
function DawnMark() {
  return (
    <>
      <path
        d="M 8 44 A 24 24 0 0 1 56 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={0.4}
      />
      <circle cx="32" cy="44" r="3" fill="currentColor" opacity={0.55} />
      <path
        d="M 26 20 L 26 40 L 40 30 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Organic leaf silhouette — nature, growth, gentle focus. */
function LeafMark() {
  return (
    <>
      <path
        d="M 32 10 C 20 22, 18 38, 32 54 C 46 38, 44 22, 32 10 Z"
        fill="currentColor"
        opacity={0.22}
      />
      <path
        d="M 32 16 L 32 48 M 32 28 C 26 32, 22 40, 32 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={0.35}
      />
      <path
        d="M 28 26 L 28 42 L 40 34 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Still-water ripples — peace, breath, unhurried viewing. */
function RippleMark() {
  return (
    <>
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity={0.2}
      />
      <circle
        cx="32"
        cy="32"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity={0.32}
      />
      <circle cx="32" cy="32" r="6" fill="currentColor" opacity={0.5} />
      <path d="M 30 30 L 30 34 L 34 32 Z" fill="currentColor" />
    </>
  );
}

/** Open horizon — spacious calm, play at the meeting of sky and sea. */
function HorizonMark() {
  return (
    <>
      <path
        d="M 6 40 C 18 34, 26 36, 32 38 C 38 36, 46 34, 58 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.35}
      />
      <path
        d="M 6 48 H 58"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d="M 24 12 L 24 34 L 38 23 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  );
}

export const LOGO_VARIANT_LABELS: Record<
  CleanTubeLogoVariant,
  { title: string; blurb: string }
> = {
  wave: {
    title: "Wave (current)",
    blurb: "Play over gentle waves — used in the header today.",
  },
  dawn: {
    title: "Dawn",
    blurb: "Sunrise arc and play — hopeful, quiet morning energy.",
  },
  leaf: {
    title: "Leaf",
    blurb: "Organic leaf and play — nature, growth, gentle focus.",
  },
  ripple: {
    title: "Ripple",
    blurb: "Still rings around play — peace, breath, unhurried calm.",
  },
  horizon: {
    title: "Horizon",
    blurb: "Sky line and play — open, spacious, emotional quiet.",
  },
};
