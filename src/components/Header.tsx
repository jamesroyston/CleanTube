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
import { setLastSearchQuery, setLastSearchSort } from "@/lib/lastSearchSession";
import { normalizeResultSortParam, normalizeSearchSortParam } from "@/lib/uploadedAtSort";

export function Header({ leading }: { leading?: ReactNode }) {
  const compactSearch = useMediaQuery("(max-width:899.95px)");
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
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [overlayQuery, setOverlayQuery] = useState("");
  const [recentList, setRecentList] = useState<string[]>([]);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

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

  function openSearchOverlay() {
    setRecentList(getRecentSearches());
    setOverlayQuery(query.trim() ? query : "");
    setSearchOverlayOpen(true);
  }

  function searchSortFromUrl(): ReturnType<typeof normalizeSearchSortParam> {
    return normalizeSearchSortParam(searchSortParam);
  }

  function runSearch(trimmed: string) {
    const sort = searchSortFromUrl();
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
                sx={{
                  width: "100%",
                  maxWidth: 560,
                  minWidth: 0,
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
        slotProps={{
          paper: {
            sx: { bgcolor: "background.default" },
          },
        }}
      >
        <Box
          component="form"
          onSubmit={onOverlaySubmit}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search or paste a YouTube URL"
            value={overlayQuery}
            onChange={(e) => setOverlayQuery(e.target.value)}
            variant="outlined"
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
