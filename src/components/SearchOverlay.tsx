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

import {
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "@/lib/recentSearches";
import type { SearchSortMode } from "@/lib/uploadedAtSort";

export type SearchOverlayProps = {
  open: boolean;
  compact: boolean;
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

export function SearchOverlay({
  open,
  compact,
  query,
  searchSortDraft,
  recentList,
  onClose,
  onQueryChange,
  onRecentListChange,
  onSearchSortChange,
  onSubmit,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focusInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  // Mobile: focus soon after open (user-gesture window); onEntered is backup after transition.
  useEffect(() => {
    if (!open || !compact) return;
    const id = requestAnimationFrame(() => focusInput());
    return () => cancelAnimationFrame(id);
  }, [compact, focusInput, open]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(query.trim());
  }

  return (
    <Dialog
      fullScreen={compact}
      open={open}
      onClose={onClose}
      maxWidth={compact ? false : "sm"}
      fullWidth={!compact}
      disableAutoFocus
      slotProps={{
        transition: {
          onEntered: focusInput,
        },
        paper: {
          sx: {
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
            ...(compact
              ? { minHeight: "100dvh" }
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
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton aria-label="Close search" onClick={onClose} edge="start">
            <ArrowBackIcon />
          </IconButton>
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
                endAdornment: (
                  <InputAdornment position="end" sx={{ gap: 0.25 }}>
                    <SearchFieldClearButton
                      visible={query.length > 0}
                      onClear={() => onQueryChange("")}
                      inputRef={inputRef}
                    />
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
      <List dense sx={{ py: 0, overflow: "auto", flex: 1, minHeight: 0 }}>
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
                onRecentListChange([]);
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
                    removeRecentSearch(item);
                    onRecentListChange(getRecentSearches());
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
