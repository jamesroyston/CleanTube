"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SearchIcon from "@mui/icons-material/Search";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";

import { useThemeMode } from "@/app/providers";
import { RetroTvLogo } from "@/components/RetroTvLogo";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { setLastSearchQuery } from "@/lib/lastSearchSession";
import { normalizeSortParam } from "@/lib/uploadedAtSort";

type HeaderProps = {
  leading?: ReactNode;
  /** Desktop: toggle library drawer (shown before logo). */
  desktopLibraryToggle?: ReactNode;
};

export function Header({ leading, desktopLibraryToggle }: HeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qParam);
  const { mode, toggleMode } = useThemeMode();

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  function buildResultsHref(trimmed: string) {
    const qs = new URLSearchParams();
    qs.set("q", trimmed);
    const sort = normalizeSortParam(searchParams.get("sort"));
    if (sort !== "relevance") qs.set("sort", sort);
    return `/?${qs.toString()}`;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/");
      return;
    }
    setLastSearchQuery(trimmed);
    router.push(buildResultsHref(trimmed));
  }

  return (
    <AppBar position="sticky" elevation={0} color="transparent">
      <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1 }}>
        {leading}
        {desktopLibraryToggle}
        <Box
          component={Link}
          href="/"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            color: "text.primary",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <RetroTvLogo size={34} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            CleanTube
          </Typography>
        </Box>
        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{ flex: 1, minWidth: 200, maxWidth: 560 }}
        >
          <TextField
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or paste a YouTube URL"
            size="small"
            fullWidth
            variant="outlined"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
          <SettingsDrawer />
          <IconButton
            onClick={toggleMode}
            aria-label={
              mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
