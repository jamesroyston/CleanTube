"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";

import { getBackToSearchHref, getLastSearchQuery } from "@/lib/lastSearchSession";

export function BackToSearch() {
  const [href, setHref] = useState("/");
  const [label, setLabel] = useState("Search");

  useLayoutEffect(() => {
    /* sessionStorage is unavailable during SSR */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate link from sessionStorage
    setHref(getBackToSearchHref());
    setLabel(getLastSearchQuery()?.trim() ? "Back to results" : "Search");
  }, []);

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
