"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";

import { getBackToSearchHref, getLastSearchQuery } from "@/lib/lastSearchSession";
import { getWatchReturnTarget } from "@/lib/watchReturnNavigation";

export function WatchBackLink() {
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useLayoutEffect(() => {
    const target = getWatchReturnTarget();
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from sessionStorage
      setHref(target.href);
      setLabel(target.label);
      return;
    }

    const q = getLastSearchQuery()?.trim();
    if (q) {
      setHref(getBackToSearchHref());
      setLabel("Back to results");
      return;
    }

    setHref(null);
  }, []);

  if (!href) return null;

  return (
    <Button
      component={Link}
      href={href}
      prefetch
      startIcon={<ArrowBackIcon />}
      sx={{ mb: 2 }}
    >
      {label}
    </Button>
  );
}
