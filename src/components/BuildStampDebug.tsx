"use client";

import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

import { LANDSCAPE_RAIL_INSET, readSafeAreaInset } from "@/lib/mobileLandscape";

/**
 * TEMPORARY debug aid for the landscape work: shows which deploy is loaded so a
 * cached PWA can be told apart from a fresh one. Bump `ITERATION` with each build
 * that is meant to be tested. Remove this component and its mount in `AppShell`,
 * plus `NEXT_PUBLIC_BUILD_SHA` in `next.config.ts`, once landscape is signed off.
 */
const ITERATION = 19;
const NOTE = "flex-end at rail";

export function BuildStampDebug() {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown";
  const [geo, setGeo] = useState("");

  useEffect(() => {
    const tick = () => {
      const iframe = document.querySelector("lite-youtube iframe");
      const shell = document.querySelector("[data-watch-player-shell]");
      const hole = document.querySelector("[data-watch-player-shell] lite-youtube")
        ?.parentElement;
      const ir = iframe?.getBoundingClientRect();
      const sr = shell?.getBoundingClientRect();
      const hr = hole?.getBoundingClientRect();
      const bits = [
        `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`,
        `saL${readSafeAreaInset("left")}/R${readSafeAreaInset("right")}`,
        sr
          ? `shell x${Math.round(sr.x)} y${Math.round(sr.y)} w${Math.round(sr.width)} h${Math.round(sr.height)}`
          : "shell -",
        hr
          ? `hole x${Math.round(hr.x)} y${Math.round(hr.y)} w${Math.round(hr.width)} h${Math.round(hr.height)}`
          : "hole -",
        ir
          ? `iframe x${Math.round(ir.x)} y${Math.round(ir.y)} ${Math.round(ir.width)}x${Math.round(ir.height)}`
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
        top: "auto",
        left: "auto",
        bottom: "max(8px, env(safe-area-inset-bottom, 0px))",
        right: `calc(${LANDSCAPE_RAIL_INSET} + 8px)`,
        px: 0.75,
        py: 0.25,
        pointerEvents: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        lineHeight: 1.3,
        fontWeight: 700,
        color: "#ff4d4f",
        bgcolor: "rgba(0, 0, 0, 0.7)",
        borderTopLeftRadius: 4,
        whiteSpace: "pre-wrap",
        maxWidth: "72vw",
        zIndex: 2147483647,
      }}
    >
      {`#${ITERATION} ${sha} · ${NOTE}\n${geo}`}
    </Box>
  );
}
