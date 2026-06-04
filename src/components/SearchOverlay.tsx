"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FormEvent, useCallback, useEffect, useRef } from "react";

import { useCloudLibrary } from "@/context/CloudLibraryContext";
import type { SearchSortMode } from "@/lib/uploadedAtSort";

export type SearchOverlayProps = {
  open: boolean;
  /** Narrow viewport: full-screen sheet (desktop mouse windows included). */
  compact: boolean;
  /**
   * Touch/PWA bottom-nav surface: self-contained sheet (no browse app bar underneath),
   * safe-area padding, and a prominent close control.
   */
  mobileExperience: boolean;
  query: string;
  searchSortDraft: SearchSortMode;
  recentList: string[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onRecentListChange: (list: string[]) => void;
  onSearchSortChange: (prefersLatest: boolean) => void;
  onSubmit: (trimmed: string) => void;
};

function SearchFieldClearButton({
  visible,
  onClear,
  inputRef,
}: {
  visible: boolean;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!visible) return null;
  return (
    <IconButton
      aria-label="Clear search"
      edge="end"
      size="small"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onClear();
        inputRef.current?.focus();
      }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );
}

const MOBILE_CLOSE_BUTTON_SX = {
  minWidth: 48,
  minHeight: 48,
  flexShrink: 0,
} as const;

const MOBILE_FULL_HEIGHT_SX = {
  minHeight: ["100vh", "-webkit-fill-available", "100dvh"],
  height: "-webkit-fill-available",
} as const;

export function SearchOverlay({
  open,
  compact,
  mobileExperience,
  query,
  searchSortDraft,
  recentList,
  onClose,
  onQueryChange,
  onRecentListChange,
  onSearchSortChange,
  onSubmit,
}: SearchOverlayProps) {
  const { clearRecentSearches, getRecentSearches, removeRecentSearch } =
    useCloudLibrary();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fullScreen = compact || mobileExperience;

  const focusInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  // Mobile: focus soon after open (user-gesture window); onEntered is backup after transition.
  useEffect(() => {
    if (!open || !fullScreen) return;
    const id = requestAnimationFrame(() => focusInput());
    return () => cancelAnimationFrame(id);
  }, [focusInput, fullScreen, open]);

  /** Prevent rubber-band scroll of browse content behind the sheet (iOS). */
  useEffect(() => {
    if (!open || !fullScreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullScreen, open]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(query.trim());
  }

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={onClose}
      maxWidth={fullScreen ? false : "sm"}
      fullWidth={!fullScreen}
      disableAutoFocus
      slotProps={{
        transition: {
          onEntered: focusInput,
        },
        paper: {
          sx: {
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            border: fullScreen ? 0 : 1,
            borderColor: "divider",
            borderRadius: fullScreen ? 0 : 2,
            overflow: "hidden",
            ...(mobileExperience
              ? {
                  pt: "env(safe-area-inset-top, 0px)",
                  ...MOBILE_FULL_HEIGHT_SX,
                }
              : compact
                ? MOBILE_FULL_HEIGHT_SX
                : {
                    mt: { xs: 8, sm: 10 },
                    maxHeight: "min(560px, calc(100vh - 96px))",
                  }),
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        autoComplete="off"
        sx={{
          px: 1.5,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {mobileExperience ? (
            <IconButton
              aria-label="Close search"
              onClick={onClose}
              edge="start"
              size="large"
              sx={MOBILE_CLOSE_BUTTON_SX}
            >
              <CloseIcon />
            </IconButton>
          ) : (
            <IconButton
              aria-label="Close search"
              onClick={onClose}
              edge="start"
              sx={compact ? MOBILE_CLOSE_BUTTON_SX : undefined}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <TextField
            fullWidth
            size="small"
            autoComplete="off"
            placeholder="Search or paste a YouTube URL"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            variant="outlined"
            inputRef={inputRef}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query.length > 0 ? (
                  <InputAdornment position="end">
                    <SearchFieldClearButton
                      visible
                      onClear={() => onQueryChange("")}
                      inputRef={inputRef}
                    />
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          {mobileExperience ? (
            <Button
              type="button"
              onClick={onClose}
              sx={{ flexShrink: 0, minHeight: 48, px: 1 }}
            >
              Cancel
            </Button>
          ) : null}
        </Box>
        <FormControlLabel
          sx={{ m: 0, mx: 0.5, alignSelf: "flex-start" }}
          control={
            <Checkbox
              size="small"
              checked={searchSortDraft === "newest"}
              onChange={(e) => onSearchSortChange(e.target.checked)}
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
        sx={{
          py: 0,
          flex: recentList.length > 0 ? 1 : "0 0 auto",
          minHeight: 0,
          overflowY: recentList.length > 0 ? "auto" : "hidden",
          overscrollBehavior: "contain",
          pb: mobileExperience
            ? "env(safe-area-inset-bottom, 0px)"
            : undefined,
        }}
      >
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
                void clearRecentSearches().then(() => onRecentListChange([]));
              }}
            >
              Clear
            </Button>
          ) : null}
        </ListSubheader>
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
                    void removeRecentSearch(item).then(() =>
                      onRecentListChange(getRecentSearches()),
                    );
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                onClick={() => {
                  onQueryChange(item);
                  onSubmit(item);
                }}
              >
                <ListItemText primary={item} sx={{ pr: 4 }} />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Dialog>
  );
}
