"use client";

import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionOffIcon from "@mui/icons-material/ClosedCaptionOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Forward10Icon from "@mui/icons-material/Forward10";
import HdIcon from "@mui/icons-material/Hd";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay10Icon from "@mui/icons-material/Replay10";
import TuneIcon from "@mui/icons-material/Tune";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  buildYoutubeWatchUrl,
  captionsEnabled,
  formatPlaybackQuality,
  isPlayerPlaying,
  readAvailableQualities,
  readPlaybackQuality,
  resolveLiteYoutubePlayer,
  SEEK_STEP_SEC,
  setPlaybackQuality,
  toggleCaptions,
  toggleMute,
  togglePlayPause,
  seekRelative,
} from "@/lib/youtubePlayerControls";
import {
  readWatchPlayerToolbarVisible,
  writeWatchPlayerToolbarVisible,
} from "@/lib/watchPlayerToolbarPersistence";
import { readPlayerCurrentTime } from "@/lib/youtubePlayer";

type WatchPlayerToolbarProps = {
  videoId: string;
  playerShellRef: RefObject<HTMLElement | null>;
  playerApiReady: boolean;
};

/** Comfortable tap targets — well above the 44px iOS minimum. */
const TOUCH_TARGET_SX = { width: 52, height: 52 } as const;

type QualityControlProps = {
  quality: string;
  qualities: string[];
  onQualityChange: (quality: string) => void;
};

function QualityControl({
  quality,
  qualities,
  onQualityChange,
}: QualityControlProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const options = qualities.length > 0 ? qualities : ["auto"];

  return (
    <>
      <Tooltip title="Quality">
        <IconButton
          aria-label="Video quality"
          aria-haspopup="listbox"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={TOUCH_TARGET_SX}
        >
          <HdIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {options.map((q) => (
          <MenuItem
            key={q}
            selected={q === quality}
            onClick={() => {
              onQualityChange(q);
              setAnchorEl(null);
            }}
          >
            <ListItemText primary={formatPlaybackQuality(q)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function WatchPlayerToolbar({
  videoId,
  playerShellRef,
  playerApiReady,
}: WatchPlayerToolbarProps) {
  const [expanded, setExpanded] = useState(() => readWatchPlayerToolbarVisible());
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [qualities, setQualities] = useState<string[]>([]);
  const [copySnackbar, setCopySnackbar] = useState(false);

  const syncFromPlayer = useCallback(async () => {
    const player = await resolveLiteYoutubePlayer(playerShellRef.current);
    if (!player) return;
    setPlaying(isPlayerPlaying(player));
    try {
      setMuted(player.isMuted());
    } catch {
      setMuted(false);
    }
    setCaptionsOn(captionsEnabled(player));
    setQuality(readPlaybackQuality(player));
    setQualities(readAvailableQualities(player));
  }, [playerShellRef]);

  useEffect(() => {
    if (!playerApiReady) return;
    void syncFromPlayer();
    const id = window.setInterval(() => {
      void syncFromPlayer();
    }, 1000);
    return () => window.clearInterval(id);
  }, [playerApiReady, syncFromPlayer, videoId]);

  const withPlayer = useCallback(
    async (fn: (player: YT.Player) => void | Promise<void>) => {
      const player = await resolveLiteYoutubePlayer(playerShellRef.current);
      if (!player) return;
      await fn(player);
      void syncFromPlayer();
    },
    [playerShellRef, syncFromPlayer],
  );

  const setExpandedPersisted = (next: boolean) => {
    setExpanded(next);
    writeWatchPlayerToolbarVisible(next);
  };

  const handleCopyUrl = async () => {
    await withPlayer(async (player) => {
      const t = readPlayerCurrentTime(player);
      const url = buildYoutubeWatchUrl(videoId, t);
      try {
        await navigator.clipboard.writeText(url);
        setCopySnackbar(true);
      } catch {
        /* clipboard unavailable */
      }
    });
  };

  if (!expanded) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TuneIcon />}
          onClick={() => setExpandedPersisted(true)}
          sx={{ borderRadius: 999, px: 2, minHeight: 40 }}
        >
          Player controls
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Tooltip title="Hide controls">
            <IconButton
              aria-label="Hide player controls"
              aria-expanded
              onClick={() => setExpandedPersisted(false)}
              size="small"
              sx={{ width: "100%", borderRadius: 0, py: 0.25 }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          rowGap={0.5}
          alignItems="center"
          justifyContent="space-evenly"
          sx={{ px: 1, py: 1 }}
        >
          <Tooltip title={`Back ${SEEK_STEP_SEC}s`}>
            <IconButton
              aria-label={`Back ${SEEK_STEP_SEC} seconds`}
              onClick={() => void withPlayer((p) => seekRelative(p, -SEEK_STEP_SEC))}
              sx={TOUCH_TARGET_SX}
            >
              <Replay10Icon />
            </IconButton>
          </Tooltip>

          <Tooltip title={playing ? "Pause" : "Play"}>
            <IconButton
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => void withPlayer((p) => togglePlayPause(p))}
              sx={TOUCH_TARGET_SX}
            >
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={`Forward ${SEEK_STEP_SEC}s`}>
            <IconButton
              aria-label={`Forward ${SEEK_STEP_SEC} seconds`}
              onClick={() => void withPlayer((p) => seekRelative(p, SEEK_STEP_SEC))}
              sx={TOUCH_TARGET_SX}
            >
              <Forward10Icon />
            </IconButton>
          </Tooltip>

          <Tooltip title={muted ? "Unmute" : "Mute"}>
            <IconButton
              aria-label={muted ? "Unmute" : "Mute"}
              aria-pressed={muted}
              onClick={() => void withPlayer((p) => toggleMute(p))}
              sx={TOUCH_TARGET_SX}
            >
              {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
          </Tooltip>

          <QualityControl
            quality={quality}
            qualities={qualities}
            onQualityChange={(q) =>
              void withPlayer((p) => setPlaybackQuality(p, q))
            }
          />

          <Tooltip title={captionsOn ? "Captions off" : "Captions on"}>
            <IconButton
              aria-label={captionsOn ? "Turn captions off" : "Turn captions on"}
              aria-pressed={captionsOn}
              onClick={() => void withPlayer((p) => toggleCaptions(p))}
              color={captionsOn ? "primary" : "default"}
              sx={TOUCH_TARGET_SX}
            >
              {captionsOn ? <ClosedCaptionIcon /> : <ClosedCaptionOffIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Copy YouTube URL">
            <IconButton
              aria-label="Copy YouTube URL"
              onClick={() => void handleCopyUrl()}
              sx={TOUCH_TARGET_SX}
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <Snackbar
        open={copySnackbar}
        autoHideDuration={2500}
        onClose={() => setCopySnackbar(false)}
        message="Link copied"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
