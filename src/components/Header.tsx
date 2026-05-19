"use client";

import SearchIcon from "@mui/icons-material/Search";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { RetroTvLogo } from "@/components/RetroTvLogo";
import { SearchOverlay } from "@/components/SearchOverlay";
import { useNavigationProgress } from "@/context/NavigationProgressContext";
import {
  addRecentSearch,
  getRecentSearches,
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

import { drawerRailTransition } from "@/components/ChannelsSidebar";

/** Browse layouts: stacked header (mobile) vs fixed bar inset by library rail (`md+`). */
export type BrowseHeaderLayout =
  | { mode: "mobile" }
  | { mode: "desktopRailMini"; railWidthPx: number };

export type HeaderProps = {
  leading?: ReactNode;
  browseLayout?: BrowseHeaderLayout;
};

export const Header = forwardRef<HTMLDivElement, HeaderProps>(
  function Header(
    { leading, browseLayout = { mode: "mobile" } },
    ref,
  ) {
    const theme = useTheme();
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
      setQuery(trimmed);
      if (!trimmed) {
        start();
        startTransition(() => {
          setSearchOverlayOpen(false);
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

    const desktopRail =
      browseLayout.mode === "desktopRailMini" ? browseLayout.railWidthPx : null;

    const displayQuery = query.trim() || "";

    return (
      <>
        <AppBar
          ref={ref}
          position={desktopRail != null ? "fixed" : "sticky"}
          elevation={0}
          color="default"
          sx={[
            {
              pt: "env(safe-area-inset-top, 0px)",
              boxSizing: "border-box",
              zIndex: (t) => t.zIndex.drawer + 1,
            },
            desktopRail != null
              ? {
                  transition: drawerRailTransition(theme),
                  left: `${desktopRail}px`,
                  right: 0,
                  width: "auto",
                  ml: 0,
                  mr: 0,
                }
              : {
                  position: { xs: "static", sm: "sticky" },
                },
          ]}
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
              <TextField
                size="small"
                fullWidth
                variant="outlined"
                placeholder="Search or paste a YouTube URL"
                value={displayQuery}
                onClick={openSearchOverlay}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openSearchOverlay();
                  }
                }}
                slotProps={{
                  input: {
                    readOnly: true,
                    "aria-label": "Open search",
                    "aria-haspopup": "dialog",
                    "aria-expanded": searchOverlayOpen,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  minWidth: 0,
                  maxWidth: compactSearch ? "100%" : 680,
                  cursor: "pointer",
                  "& .MuiInputBase-input": { cursor: "pointer" },
                }}
              />
            </Box>

            <Box sx={{ flexShrink: 0 }}>
              <AccountMenu />
            </Box>
          </Toolbar>
        </AppBar>

        <SearchOverlay
          open={searchOverlayOpen}
          compact={compactSearch}
          query={overlayQuery}
          searchSortDraft={searchSortDraft}
          recentList={recentList}
          onClose={() => setSearchOverlayOpen(false)}
          onQueryChange={setOverlayQuery}
          onRecentListChange={setRecentList}
          onSearchSortChange={commitSearchLatestPreference}
          onSubmit={runSearch}
        />
      </>
    );
  },
);

Header.displayName = "Header";
