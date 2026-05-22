"use client";

import SearchIcon from "@mui/icons-material/Search";
import AppBar from "@mui/material/AppBar";
import Fab from "@mui/material/Fab";
import InputAdornment from "@mui/material/InputAdornment";
import Slide from "@mui/material/Slide";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useRef, useState } from "react";

import { useSearchChrome } from "@/context/SearchChromeContext";

const SCROLL_UP_THRESHOLD_PX = 80;
const FAB_SCROLL_THRESHOLD_PX = 320;

export function MobileSearchChrome() {
  const theme = useTheme();
  const mobile = useMediaQuery("(max-width:899.95px)");
  const { openSearchOverlay } = useSearchChrome();
  const [showFab, setShowFab] = useState(false);
  const [showCompactBar, setShowCompactBar] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!mobile) {
      setShowFab(false);
      setShowCompactBar(false);
      return;
    }

    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollYRef.current;

        setShowFab(y > FAB_SCROLL_THRESHOLD_PX);

        if (y > SCROLL_UP_THRESHOLD_PX && delta < 0) {
          setShowCompactBar(true);
        } else if (delta > 0 || y <= SCROLL_UP_THRESHOLD_PX) {
          setShowCompactBar(false);
        }

        lastScrollYRef.current = y;
        ticking = false;
      });
    }

    lastScrollYRef.current = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobile]);

  if (!mobile) return null;

  const chromeZ = theme.zIndex.modal - 1;

  return (
    <>
      <Slide appear={false} direction="down" in={showCompactBar}>
        <AppBar
          position="fixed"
          elevation={1}
          color="default"
          sx={{
            top: 0,
            left: 0,
            right: 0,
            pt: "env(safe-area-inset-top, 0px)",
            boxSizing: "border-box",
            zIndex: chromeZ,
          }}
        >
          <Toolbar
            sx={{
              minHeight: 48,
              px: 1.5,
              py: 0.5,
              gap: 1,
            }}
          >
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Search or paste a YouTube URL"
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
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                cursor: "pointer",
                "& .MuiInputBase-input": { cursor: "pointer" },
              }}
            />
          </Toolbar>
        </AppBar>
      </Slide>

      <Fab
        color="primary"
        aria-label="Open search"
        onClick={openSearchOverlay}
        sx={{
          position: "fixed",
          right: 16,
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          zIndex: chromeZ,
          display: showFab ? "flex" : "none",
        }}
      >
        <SearchIcon />
      </Fab>
    </>
  );
}
