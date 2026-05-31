"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { getBackToSearchHref, getLastSearchQuery } from "@/lib/lastSearchSession";
import { getWatchReturnTarget } from "@/lib/watchReturnNavigation";

function resolveWatchBackLink(): { href: string; label: string } | null {
  const target = getWatchReturnTarget();
  if (target) return target;

  const q = getLastSearchQuery()?.trim();
  if (q) {
    return { href: getBackToSearchHref(), label: "Back to results" };
  }

  return null;
}

export function WatchBackLink() {
  const pathname = usePathname();
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const hydrate = useCallback(() => {
    const resolved = resolveWatchBackLink();
    setHref(resolved?.href ?? null);
    setLabel(resolved?.label ?? "");
  }, []);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate, pathname]);

  useEffect(() => {
    hydrate();
  }, [hydrate, pathname]);

  if (!href) return null;

  return (
    <Button
      component={Link}
      href={href}
      prefetch
      scroll={false}
      startIcon={<ArrowBackIcon />}
      sx={{ mb: 2 }}
    >
      {label}
    </Button>
  );
}
