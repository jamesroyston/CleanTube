"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import type { RefObject } from "react";
import { useState } from "react";

import { readPlayerCurrentTime } from "@/lib/youtubePlayer";
import {
  buildCleantubeWatchUrl,
  buildYoutubeWatchUrl,
  resolveLiteYoutubePlayer,
} from "@/lib/youtubePlayerControls";

type WatchShareButtonProps = {
  videoId: string;
  playerShellRef: RefObject<HTMLElement | null>;
};

export function WatchShareButton({
  videoId,
  playerShellRef,
}: WatchShareButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const open = Boolean(anchorEl);

  const currentSeconds = async (): Promise<number | undefined> => {
    const player = await resolveLiteYoutubePlayer(playerShellRef.current);
    if (!player) return undefined;
    const t = readPlayerCurrentTime(player);
    return t != null && t > 0 ? t : undefined;
  };

  const copy = async (kind: "cleantube" | "youtube") => {
    setAnchorEl(null);
    const t = await currentSeconds();
    const url =
      kind === "cleantube"
        ? buildCleantubeWatchUrl(window.location.origin, videoId, t)
        : buildYoutubeWatchUrl(videoId, t);
    try {
      await navigator.clipboard.writeText(url);
      setSnackbarOpen(true);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ShareOutlinedIcon />}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ alignSelf: "flex-start" }}
      >
        Copy link
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem onClick={() => void copy("cleantube")}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Copy CleanTube link"
            secondary="Opens in CleanTube"
          />
        </MenuItem>
        <MenuItem onClick={() => void copy("youtube")}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Copy YouTube link"
            secondary="Opens on youtube.com"
          />
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        message="Link copied"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
}
