"use client";

import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import CheckIcon from "@mui/icons-material/Check";
import Button from "@mui/material/Button";
import { useMemo } from "react";

import { useSavedChannels } from "@/context/SavedChannelsContext";

type SaveSearchButtonProps = {
  query: string;
};

export function SaveSearchButton({ query }: SaveSearchButtonProps) {
  const { channels, addChannel } = useSavedChannels();
  const trimmedQuery = query.trim();

  const alreadySaved = useMemo(() => {
    const normalized = trimmedQuery.toLowerCase();
    if (!normalized) return true;
    return channels.some(
      (channel) =>
        !channel.channelId &&
        channel.searchQuery.trim().toLowerCase() === normalized,
    );
  }, [channels, trimmedQuery]);

  if (!trimmedQuery) return null;

  if (alreadySaved) {
    return (
      <Button
        size="small"
        variant="outlined"
        color="success"
        startIcon={<CheckIcon />}
        disabled
      >
        Search pinned
      </Button>
    );
  }

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<BookmarkAddOutlinedIcon />}
      onClick={() =>
        addChannel({
          name: trimmedQuery,
          searchQuery: trimmedQuery,
        })
      }
    >
      Pin search
    </Button>
  );
}
