"use client";

import SearchIcon from "@mui/icons-material/Search";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
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
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        position: { xs: "static", md: "sticky" },
        zIndex: (t) => t.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "auto minmax(0, 1fr) auto",
            sm: "minmax(0, 1fr) minmax(240px, 560px) minmax(0, 1fr)",
          },
          alignItems: "center",
          gap: { xs: 0.75, sm: 2 },
          py: { xs: 0.75, sm: 1 },
          px: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.75, sm: 1 },
            minWidth: 0,
            justifySelf: "start",
          }}
        >
          {leading}
          <Box
            component={Link}
            href="/"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: { xs: 0, sm: 1 },
              color: "text.primary",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <RetroTvLogo size={30} />
            <Typography
              variant="h6"
              sx={{
                display: { xs: "none", sm: "block" },
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              CleanTube
            </Typography>
          </Box>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: 560,
            justifySelf: "center",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <TextField
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or paste a YouTube URL"
            size="small"
            fullWidth
            variant="outlined"
            sx={{ minWidth: 0 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{
                      mr: 0.5,
                      ml: -0.5,
                      "& .MuiInputAdornment-root": { marginRight: 0 },
                    }}
                  >
                    <Select<SearchSortMode>
                      value={searchSort}
                      onChange={(e) =>
                        setSearchSort(e.target.value as SearchSortMode)
                      }
                      variant="standard"
                      disableUnderline
                      MenuProps={{
                        slotProps: { paper: { sx: { mt: 1 } } },
                      }}
                      sx={{
                        fontSize: "0.8125rem",
                        minWidth: { xs: 92, sm: 118 },
                        "& .MuiSelect-select": {
                          py: 0.5,
                          pr: "24px !important",
                          pl: 0.5,
                          display: "flex",
                          alignItems: "center",
                        },
                        "&:before, &:after": { display: "none" },
                      }}
                    >
                      <MenuItem value="relevance">Relevance</MenuItem>
                      <MenuItem value="newest">Newest uploads</MenuItem>
                    </Select>
                  </InputAdornment>
                ),
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

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            justifySelf: "end",
            flexShrink: 0,
          }}
        >
          <AccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
