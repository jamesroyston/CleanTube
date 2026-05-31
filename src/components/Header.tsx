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
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { RetroTvLogo } from "@/components/RetroTvLogo";
import { SearchOverlay } from "@/components/SearchOverlay";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useSearchChrome } from "@/context/SearchChromeContext";
import { useNavigationProgress } from "@/context/NavigationProgressContext";
import {
  getLastSearchSort,
  setLastSearchQuery,
  setLastSearchSort,
} from "@/lib/lastSearchSession";
import type { SearchSortMode } from "@/lib/uploadedAtSort";
import {
  channelPageHrefFromToken,
  extractChannelRouteTokenFromUrl,
  extractVideoIdFromUrl,
  isLikelyYouTubeUrl,
} from "@/lib/youtube";
import { extractStartSecondsFromYoutubeInput } from "@/lib/youtubeTime";
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
    const headerScrollsAway = useMediaQuery(
      "(max-width:599.95px), (max-width:899.95px) and (orientation: landscape)",
    );
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { start, done } = useNavigationProgress();
    const { addRecentSearch, getRecentSearches } = useCloudLibrary();
    const {
      registerOpenSearchOverlay,
      mobileHeaderRevealProgress,
      mobileHeaderOverlayMode,
    } = useSearchChrome();
    const [isPending, startTransition] = useTransition();
    const hadPendingRef = useRef(false);
    const qParam = searchParams.get("q") ?? "";
    const [query, setQuery] = useState(qParam);
    const [searchSortDraft, setSearchSortDraft] =
      useState<SearchSortMode>("relevance");
    const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
    const searchOverlayHistoryPushedRef = useRef(false);
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

    const closeSearchOverlay = useCallback((fromPopState = false) => {
      setSearchOverlayOpen(false);
      if (fromPopState) {
        searchOverlayHistoryPushedRef.current = false;
        return;
      }
      if (searchOverlayHistoryPushedRef.current) {
        searchOverlayHistoryPushedRef.current = false;
        window.history.back();
      }
    }, []);

    const openSearchOverlay = useCallback(() => {
      setRecentList(getRecentSearches());
      setOverlayQuery(query.trim() ? query : "");
      setSearchOverlayOpen(true);
      if (!searchOverlayHistoryPushedRef.current) {
        window.history.pushState(
          { cleantubeOverlay: "search" },
          "",
          window.location.href,
        );
        searchOverlayHistoryPushedRef.current = true;
      }
    }, [getRecentSearches, query]);

    useEffect(() => {
      const onPopState = () => {
        if (searchOverlayHistoryPushedRef.current) {
          closeSearchOverlay(true);
        }
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }, [closeSearchOverlay]);

    useEffect(() => {
      registerOpenSearchOverlay(openSearchOverlay);
      return () => registerOpenSearchOverlay(null);
    }, [openSearchOverlay, registerOpenSearchOverlay]);

    function commitSearchLatestPreference(prefersLatest: boolean) {
      const mode: SearchSortMode = prefersLatest ? "newest" : "relevance";
      setSearchSortDraft(mode);
      setLastSearchSort(mode);
    }

    function runSearch(trimmed: string) {
      const sort = searchSortDraft;
      setQuery(trimmed);
      if (trimmed && isLikelyYouTubeUrl(trimmed)) {
        const fromUrl = extractVideoIdFromUrl(trimmed);
        if (fromUrl) {
          const startSeconds = extractStartSecondsFromYoutubeInput(trimmed);
          const qs =
            startSeconds != null && startSeconds > 0
              ? `?t=${encodeURIComponent(String(startSeconds))}`
              : "";
          start();
          startTransition(() => {
            closeSearchOverlay(true);
            router.push(`/watch/${fromUrl}${qs}`);
          });
          return;
        }
        const channelToken = extractChannelRouteTokenFromUrl(trimmed);
        if (channelToken) {
          start();
          startTransition(() => {
            closeSearchOverlay(true);
            router.push(channelPageHrefFromToken(channelToken));
          });
          return;
        }
      }
      if (!trimmed) {
        start();
        startTransition(() => {
          closeSearchOverlay(true);
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
      void addRecentSearch(trimmed);
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
        closeSearchOverlay(true);
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
    const mobileScrollReveal =
      compactSearch && desktopRail == null && headerScrollsAway;
    const showOverlayChrome =
      mobileScrollReveal && mobileHeaderOverlayMode;
    const revealProgress = showOverlayChrome ? mobileHeaderRevealProgress : 0;

    const appBar = (
        <AppBar
          ref={ref}
          position={
            showOverlayChrome
              ? "fixed"
              : desktopRail != null
                ? "fixed"
                : "sticky"
          }
          elevation={revealProgress > 0.85 ? 1 : 0}
          color="default"
          sx={[
            {
              pt: "env(safe-area-inset-top, 0px)",
              boxSizing: "border-box",
              zIndex: showOverlayChrome
                ? (t) => t.zIndex.modal - 1
                : (t) => t.zIndex.drawer + 1,
            },
            showOverlayChrome
              ? {
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translate3d(0, calc((1 - ${revealProgress}) * -100%), 0)`,
                  pointerEvents: revealProgress > 0.08 ? "auto" : "none",
                  willChange: "transform",
                }
              : desktopRail != null
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
                  /** Mobile landscape: avoid sticky bar over video/content */
                  "@media (max-width: 899.95px) and (orientation: landscape)": {
                    position: "static",
                  },
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
    );

    return (
      <>
        {appBar}

        <SearchOverlay
          open={searchOverlayOpen}
          compact={compactSearch}
          query={overlayQuery}
          searchSortDraft={searchSortDraft}
          recentList={recentList}
          onClose={() => closeSearchOverlay()}
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
