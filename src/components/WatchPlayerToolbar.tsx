"use client";

import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionOffIcon from "@mui/icons-material/ClosedCaptionOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Forward10Icon from "@mui/icons-material/Forward10";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay10Icon from "@mui/icons-material/Replay10";
import TuneIcon from "@mui/icons-material/Tune";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Slider from "@mui/material/Slider";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildYoutubeWatchUrl,
  captionsEnabled,
  isPlayerPlaying,
  readPlayerVolume,
  resolveLiteYoutubePlayer,
  SEEK_STEP_SEC,
  setPlayerVolume,
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

type VolumeControlProps = {
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeCommit: (value: number) => void;
  onInteractingChange: (interacting: boolean) => void;
};

function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) return <VolumeOffIcon />;
  if (volume < 50) return <VolumeDownIcon />;
  return <VolumeUpIcon />;
}

function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onVolumeChange,
  onVolumeCommit,
  onInteractingChange,
}: VolumeControlProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const displayValue = muted ? 0 : volume;

  return (
    <>
      <Tooltip title="Volume">
        <IconButton
          aria-label="Adjust volume"
          aria-haspopup="dialog"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={TOUCH_TARGET_SX}
        >
          <VolumeIcon volume={volume} muted={muted} />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => {
          onInteractingChange(false);
          setAnchorEl(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{ paper: { sx: { overflow: "visible", borderRadius: 2 } } }}
      >
        <Stack alignItems="center" spacing={1} sx={{ py: 2, px: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {displayValue}
          </Typography>
          <Slider
            aria-label="Volume"
            orientation="vertical"
            value={displayValue}
            min={0}
            max={100}
            onChange={(_, value) => {
              onInteractingChange(true);
              const v = Array.isArray(value) ? value[0] : value;
              onVolumeChange(v);
            }}
            onChangeCommitted={(_, value) => {
              const v = Array.isArray(value) ? value[0] : value;
              onVolumeCommit(v);
              onInteractingChange(false);
            }}
            sx={{ height: 150, py: 1 }}
          />
          <Tooltip title={muted ? "Unmute" : "Mute"}>
            <IconButton
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={onToggleMute}
              size="small"
            >
              <VolumeIcon volume={volume} muted={muted} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Popover>
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
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const volumeInteractingRef = useRef(false);

  const syncFromPlayer = useCallback(async () => {
    const player = await resolveLiteYoutubePlayer(playerShellRef.current);
    if (!player) return;
    setPlaying(isPlayerPlaying(player));
    if (!volumeInteractingRef.current) {
      setVolume(readPlayerVolume(player));
      try {
        setMuted(player.isMuted());
      } catch {
        setMuted(false);
      }
    }
    setCaptionsOn(captionsEnabled(player));
  }, [playerShellRef]);

  useEffect(() => {
    if (!playerApiReady || !expanded) return;
    void syncFromPlayer();
    const id = window.setInterval(() => {
      void syncFromPlayer();
    }, 1000);
    return () => window.clearInterval(id);
  }, [playerApiReady, expanded, syncFromPlayer, videoId]);

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

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    setMuted(value === 0);
  };

  const handleVolumeCommit = (value: number) => {
    void withPlayer((p) => setPlayerVolume(p, value));
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

          <VolumeControl
            volume={volume}
            muted={muted}
            onToggleMute={() => void withPlayer((p) => toggleMute(p))}
            onVolumeChange={handleVolumeChange}
            onVolumeCommit={handleVolumeCommit}
            onInteractingChange={(interacting) => {
              volumeInteractingRef.current = interacting;
            }}
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
