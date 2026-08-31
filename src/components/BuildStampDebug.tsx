"use client";

import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

/**
 * TEMPORARY debug aid for the landscape work: shows which deploy is loaded so a
 * cached PWA can be told apart from a fresh one. Bump `ITERATION` with each build
 * that is meant to be tested. Remove this component and its mount in `AppShell`,
 * plus `NEXT_PUBLIC_BUILD_SHA` in `next.config.ts`, once landscape is signed off.
 */
const ITERATION = 9;
const NOTE = "iframe to screen left";

function readSafeArea(side: "left" | "right"): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;padding-${side}:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0;
  probe.remove();
  return Math.round(value);
}

export function BuildStampDebug() {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown";
  const [geo, setGeo] = useState("");

  useEffect(() => {
    const tick = () => {
      const iframe = document.querySelector("lite-youtube iframe");
      const shell = document.querySelector("[data-watch-player-shell]");
      const ir = iframe?.getBoundingClientRect();
      const sr = shell?.getBoundingClientRect();
      const bits = [
        `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`,
        `saL${readSafeArea("left")}/R${readSafeArea("right")}`,
        sr
          ? `shell x${Math.round(sr.x)} w${Math.round(sr.width)}`
          : "shell -",
        ir
          ? `iframe x${Math.round(ir.x)} w${Math.round(ir.width)}`
          : "iframe -",
      ];
      setGeo(bits.join(" · "));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    window.addEventListener("resize", tick);
    window.addEventListener("orientationchange", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", tick);
      window.removeEventListener("orientationchange", tick);
    };
  }, []);

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
        fontSize: 10,
        lineHeight: 1.3,
        fontWeight: 700,
        color: "#ff4d4f",
        bgcolor: "rgba(0, 0, 0, 0.7)",
        borderBottomRightRadius: 4,
        whiteSpace: "pre-wrap",
        maxWidth: "70vw",
        zIndex: 2147483647,
      }}
    >
      {`#${ITERATION} ${sha} · ${NOTE}\n${geo}`}
    </Box>
  );
}
