"use client";

import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
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
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "@/lib/recentSearches";
import {
  getLastSearchSort,
  setLastSearchQuery,
  setLastSearchSort,
} from "@/lib/lastSearchSession";
import type { SearchSortMode } from "@/lib/uploadedAtSort";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
} from "@/lib/uploadedAtSort";

export function Header({ leading }: { leading?: ReactNode }) {
  const compactSearch = useMediaQuery("(max-width:899.95px)");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { start, done } = useNavigationProgress();
  const [isPending, startTransition] = useTransition();
  const hadPendingRef = useRef(false);
  const qParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qParam);
  const [searchSortDraft, setSearchSortDraft] =
    useState<SearchSortMode>("relevance");
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [overlayQuery, setOverlayQuery] = useState("");
  const [recentList, setRecentList] = useState<string[]>([]);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const explicit = searchParams.get("searchSort");
    const legacySort = searchParams.get("sort");
    const qPresent = Boolean(searchParams.get("q")?.trim());

    if (pathname === "/" && qPresent) {
      if (explicit != null) {
        setSearchSortDraft(normalizeSearchSortParam(explicit));
        return;
      }
      if (legacySort === "newest") {
        setSearchSortDraft("newest");
        return;
      }
      setSearchSortDraft("relevance");
      return;
    }

    if (explicit != null) {
      setSearchSortDraft(normalizeSearchSortParam(explicit));
      return;
    }
    if (legacySort === "newest") {
      setSearchSortDraft("newest");
      return;
    }
    setSearchSortDraft(getLastSearchSort());
  }, [pathname, searchParams]);

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

  useEffect(() => {
    if (!searchOverlayOpen || !compactSearch) return;
    const id = window.requestAnimationFrame(() => {
      overlayInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [compactSearch, searchOverlayOpen]);

  function openSearchOverlay() {
    setRecentList(getRecentSearches());
    setOverlayQuery(query.trim() ? query : "");
    setSearchOverlayOpen(true);
  }

  function commitSearchLatestPreference(prefersLatest: boolean) {
    const mode: SearchSortMode = prefersLatest ? "newest" : "relevance";
    setSearchSortDraft(mode);
    setLastSearchSort(mode);
  }

  function runSearch(trimmed: string) {
    const sort = searchSortDraft;
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
    setLastSearchSort(sort);
    addRecentSearch(trimmed);
    const qs = new URLSearchParams();
    qs.set("q", trimmed);
    const resultSort = normalizeResultSortParam(
      searchParams.get("resultSort") ?? searchParams.get("sort"),
    );
    if (sort !== "relevance") {
      qs.set("searchSort", sort);
    }
    if (resultSort !== "search") qs.set("resultSort", resultSort);
    const href = `/?${qs.toString()}`;
    const currentSearch = searchParams.toString();
    const currentHref = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
    start();
    startTransition(() => {
      setSearchOverlayOpen(false);
      if (currentHref === href) {
        router.refresh();
      } else {
        router.push(href);
      }
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query.trim());
  }

  function onOverlaySubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(overlayQuery.trim());
  }

  return (
    <>
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
            display: "flex",
            alignItems: "center",
            flexWrap: "nowrap",
            gap: compactSearch ? 0.75 : 2,
            py: { xs: 0.75, sm: 1 },
            px: { xs: 1, sm: 2 },
            minHeight: { xs: 56, sm: 64 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: compactSearch ? 0.5 : 1,
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            {leading}
            <Box
              component={Link}
              href="/"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: compactSearch ? 0 : 1,
                color: "text.primary",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <RetroTvLogo size={30} />
              <Typography
                variant="h6"
                sx={{
                  display: compactSearch ? "none" : "block",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                CleanTube
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              justifyContent: "center",
              mx: compactSearch ? 0.25 : 1,
            }}
          >
            {compactSearch ? (
              <TextField
                size="small"
                fullWidth
                variant="outlined"
                placeholder="Search or paste URL"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={openSearchOverlay}
                slotProps={{
                  input: {
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 0, maxWidth: compactSearch ? "100%" : 560 }}
              />
            ) : (
              <Box
                component="form"
                onSubmit={onSubmit}
                autoComplete="off"
                sx={{
                  width: "100%",
                  maxWidth: 680,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <FormControlLabel
                  sx={{ flexShrink: 0, m: 0, maxWidth: 200 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={searchSortDraft === "newest"}
                      onChange={(e) =>
                        commitSearchLatestPreference(e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2" component="span">
                      Most recent uploads
                    </Typography>
                  }
                />
                <TextField
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  placeholder="Search or paste a YouTube URL"
                  size="small"
                  fullWidth
                  variant="outlined"
                  sx={{ minWidth: 0, flex: 1 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ mr: 0.5, ml: -0.25 }}>
                          <SearchIcon color="action" fontSize="small" />
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
            )}
          </Box>

          <Box sx={{ flexShrink: 0 }}>
            <AccountMenu />
          </Box>
        </Toolbar>
      </AppBar>

      <Dialog
        fullScreen
        open={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        disableAutoFocus
        slotProps={{
          paper: {
            sx: { bgcolor: "background.default" },
          },
        }}
      >
        <Box
          component="form"
          onSubmit={onOverlaySubmit}
          autoComplete="off"
          sx={{
            px: 1.5,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              autoComplete="off"
              placeholder="Search or paste a YouTube URL"
              value={overlayQuery}
              onChange={(e) => setOverlayQuery(e.target.value)}
              variant="outlined"
              inputRef={overlayInputRef}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <IconButton
              aria-label="Close search"
              onClick={() => setSearchOverlayOpen(false)}
              edge="end"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <FormControlLabel
            sx={{ m: 0, mx: -0.5, alignSelf: "flex-start" }}
            control={
              <Checkbox
                size="small"
                checked={searchSortDraft === "newest"}
                onChange={(e) =>
                  commitSearchLatestPreference(e.target.checked)
                }
              />
            }
            label={
              <Typography variant="body2" component="span">
                Most recent uploads
              </Typography>
            }
          />
        </Box>
        <List
          dense
          sx={{ py: 0 }}
          subheader={
            <ListSubheader
              component="div"
              disableSticky
              sx={{
                bgcolor: "background.default",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pr: 1,
                lineHeight: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Recent searches
              </Typography>
              {recentList.length > 0 ? (
                <Button
                  size="small"
                  startIcon={<ClearAllIcon fontSize="small" />}
                  onClick={() => {
                    clearRecentSearches();
                    setRecentList([]);
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </ListSubheader>
          }
        >
          {recentList.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 2 }}
            >
              No recent searches yet.
            </Typography>
          ) : (
            recentList.map((item) => (
              <ListItem
                key={item}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={`Remove ${item}`}
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeRecentSearch(item);
                      setRecentList(getRecentSearches());
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => {
                    setOverlayQuery(item);
                    runSearch(item);
                  }}
                >
                  <ListItemText primary={item} sx={{ pr: 4 }} />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Dialog>
    </>
  );
}
