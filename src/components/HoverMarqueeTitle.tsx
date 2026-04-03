"use client";

import Box from "@mui/material/Box";
import Typography, { type TypographyProps } from "@mui/material/Typography";
import { useLayoutEffect, useRef, useState } from "react";

type HoverMarqueeTitleProps = {
  text: string;
  variant?: TypographyProps["variant"];
  sx?: TypographyProps["sx"];
};

/**
 * Single-line title that pans left↔right on hover when it overflows (e.g. narrow sidebar).
 */
export function HoverMarqueeTitle({
  text,
  variant = "body2",
  sx,
}: HoverMarqueeTitleProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () =>
      setOverflowPx(Math.max(0, inner.scrollWidth - outer.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text]);

  return (
    <Box
      ref={outerRef}
      sx={{
        overflow: "hidden",
        width: "100%",
        flex: "1 1 auto",
        minWidth: 0,
        ...(overflowPx > 0
          ? {
              "@keyframes cleantube-marquee": {
                "0%": { transform: "translateX(0)" },
                "100%": { transform: `translateX(-${overflowPx}px)` },
              },
              "&:hover .cleantube-marquee-inner": {
                animation: "cleantube-marquee 4.5s ease-in-out infinite alternate",
              },
            }
          : {}),
      }}
    >
      <Typography
        ref={innerRef}
        variant={variant}
        className="cleantube-marquee-inner"
        component="div"
        sx={{
          display: "inline-block",
          whiteSpace: "nowrap",
          fontWeight: 600,
          ...sx,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}
