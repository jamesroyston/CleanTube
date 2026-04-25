"use client";

import SearchIcon from "@mui/icons-material/Search";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { RetroTvLogo } from "@/components/RetroTvLogo";
import { useNavigationProgress } from "@/context/NavigationProgressContext";
import { setLastSearchQuery, setLastSearchSort } from "@/lib/lastSearchSession";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
  type SearchSortMode,
} from "@/lib/uploadedAtSort";

export function Header({ leading }: { leading?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { start, done } = useNavigationProgress();
  const [isPending, startTransition] = useTransition();
  const hadPendingRef = useRef(false);
  const qParam = searchParams.get("q") ?? "";
  const legacySortParam = searchParams.get("sort");
  const searchSortParam = searchParams.get("searchSort") ?? legacySortParam;
  const [query, setQuery] = useState(qParam);
  const [searchSort, setSearchSort] = useState<SearchSortMode>(() =>
    normalizeSearchSortParam(searchSortParam),
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the controlled search form after route changes
    setQuery(qParam);
    setSearchSort(normalizeSearchSortParam(searchSortParam));
  }, [qParam, searchSortParam]);

  useEffect(() => {
    if (isPending) {
      hadPendingRef.current = true;
      start();
      return;
    }
    if (hadPendingRef.current) {
      hadPendingRef.current = false;
      done();
    }
  }, [done, isPending, start]);

  function buildResultsHref(trimmed: string) {
    const qs = new URLSearchParams();
    qs.set("q", trimmed);
    const resultSort = normalizeResultSortParam(
      searchParams.get("resultSort") ?? searchParams.get("sort"),
    );
    if (searchSort !== "relevance") {
      qs.set("searchSort", searchSort);
    }
    if (resultSort !== "search") qs.set("resultSort", resultSort);
    return `/?${qs.toString()}`;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      start();
      startTransition(() => {
        if (pathname === "/" && searchParams.toString() === "") {
          router.refresh();
        } else {
          router.push("/");
        }
      });
      return;
    }
    setLastSearchQuery(trimmed);
    setLastSearchSort(searchSort);
    const href = buildResultsHref(trimmed);
    const currentSearch = searchParams.toString();
    const currentHref = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
    start();
    startTransition(() => {
      if (currentHref === href) {
        router.refresh();
      } else {
        router.push(href);
      }
    });
  }

  return (
    <AppBar position="sticky" elevation={0} color="transparent">
      <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1 }}>
        {leading}
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
          sx={{
            flex: 1,
            minWidth: 240,
            maxWidth: 720,
            display: "flex",
            gap: 1,
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 156 } }}>
            <InputLabel id="cleantube-search-sort-label">Search type</InputLabel>
            <Select<SearchSortMode>
              labelId="cleantube-search-sort-label"
              label="Search type"
              value={searchSort}
              onChange={(e) => setSearchSort(e.target.value as SearchSortMode)}
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="newest">Newest uploads</MenuItem>
            </Select>
          </FormControl>
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
                    <IconButton
                      aria-label="Search"
                      edge="end"
                      size="small"
                      type="submit"
                    >
                      <SearchIcon color="action" fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
          <AccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
