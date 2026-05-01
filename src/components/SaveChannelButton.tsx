"use client";

import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import BookmarkRemoveOutlinedIcon from "@mui/icons-material/BookmarkRemoveOutlined";
import Button from "@mui/material/Button";
import { useMemo } from "react";

import { useSavedChannels } from "@/context/SavedChannelsContext";

type SaveChannelButtonProps = {
  channelName: string;
  channelId?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
};

export function SaveChannelButton({
  channelName,
  channelId,
  channelUrl,
  thumbnailUrl,
}: SaveChannelButtonProps) {
  const { channels, addChannel, removeChannel } = useSavedChannels();
  const trimmedName = channelName.trim();
  const searchQuery = trimmedName;

  const savedMatch = useMemo(() => {
    if (!trimmedName) return undefined;
    const q = searchQuery.toLowerCase();
    return channels.find(
      (c) =>
        (channelId && c.channelId === channelId) ||
        (channelUrl && c.channelUrl === channelUrl) ||
        c.searchQuery.trim().toLowerCase() === q,
    );
  }, [channels, channelId, channelUrl, searchQuery, trimmedName]);

  const alreadySaved = Boolean(savedMatch);

  if (!trimmedName || trimmedName === "Unknown channel") {
    return null;
  }

  if (alreadySaved && savedMatch) {
    return (
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<BookmarkRemoveOutlinedIcon />}
        onClick={() => removeChannel(savedMatch.id)}
        sx={{ alignSelf: "flex-start" }}
      >
        Remove from saved
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
          name: trimmedName,
          channelId,
          channelUrl,
          thumbnailUrl,
          searchQuery,
        })
      }
      sx={{ alignSelf: "flex-start" }}
    >
      Save channel
    </Button>
  );
}
