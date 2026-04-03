"use client";

import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import CheckIcon from "@mui/icons-material/Check";
import Button from "@mui/material/Button";
import { useMemo } from "react";

import { useSavedChannels } from "@/context/SavedChannelsContext";

type SaveChannelButtonProps = {
  channelName: string;
  channelId?: string;
  channelUrl?: string;
};

export function SaveChannelButton({
  channelName,
  channelId,
  channelUrl,
}: SaveChannelButtonProps) {
  const { channels, addChannel } = useSavedChannels();
  const trimmedName = channelName.trim();
  const searchQuery = trimmedName;

  const alreadySaved = useMemo(() => {
    if (!trimmedName) return true;
    const q = searchQuery.toLowerCase();
    return channels.some(
      (c) =>
        (channelId && c.channelId === channelId) ||
        (channelUrl && c.channelUrl === channelUrl) ||
        c.searchQuery.trim().toLowerCase() === q,
    );
  }, [channels, channelId, channelUrl, searchQuery, trimmedName]);

  if (!trimmedName || trimmedName === "Unknown channel") {
    return null;
  }

  if (alreadySaved) {
    return (
      <Button
        size="small"
        variant="outlined"
        color="success"
        startIcon={<CheckIcon />}
        disabled
        sx={{ alignSelf: "flex-start" }}
      >
        Channel saved
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
          searchQuery,
        })
      }
      sx={{ alignSelf: "flex-start" }}
    >
      Save channel
    </Button>
  );
}
