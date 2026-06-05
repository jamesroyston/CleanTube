"use client";

import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionOffIcon from "@mui/icons-material/ClosedCaptionOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Forward10Icon from "@mui/icons-material/Forward10";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Replay10Icon from "@mui/icons-material/Replay10";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
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
  readPlayerVolume,
  resolveLiteYoutubePlayer,
  SEEK_STEP_SEC,
  setPlaybackQuality,
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
  const [qualities, setQualities] = useState<string[]>([]);
  const [quality, setQuality] = useState("auto");
  const [copySnackbar, setCopySnackbar] = useState(false);

  const syncFromPlayer = useCallback(async () => {
    const player = await resolveLiteYoutubePlayer(playerShellRef.current);
    if (!player) return;
    setPlaying(isPlayerPlaying(player));
    setVolume(readPlayerVolume(player));
    try {
      setMuted(player.isMuted());
    } catch {
      setMuted(false);
    }
    setCaptionsOn(captionsEnabled(player));
    const available = readAvailableQualities(player);
    if (available.length > 0) setQualities(available);
    setQuality(readPlaybackQuality(player));
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

  const toggleExpanded = () => {
    const next = !expanded;
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
        /* ignore */
      }
    });
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: -40,
          right: 8,
          zIndex: 2,
        }}
      >
        <Tooltip title={expanded ? "Hide controls" : "Show controls"}>
          <IconButton
            size="small"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide player controls" : "Show player controls"}
            sx={{
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {expanded ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {expanded ? (
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ minWidth: "min-content" }}
          >
            <Tooltip title={`Back ${SEEK_STEP_SEC}s`}>
              <IconButton
                aria-label={`Back ${SEEK_STEP_SEC} seconds`}
                onClick={() => void withPlayer((p) => seekRelative(p, -SEEK_STEP_SEC))}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <Replay10Icon />
              </IconButton>
            </Tooltip>

            <Tooltip title={playing ? "Pause" : "Play"}>
              <IconButton
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => void withPlayer((p) => togglePlayPause(p))}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                {playing ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={`Forward ${SEEK_STEP_SEC}s`}>
              <IconButton
                aria-label={`Forward ${SEEK_STEP_SEC} seconds`}
                onClick={() => void withPlayer((p) => seekRelative(p, SEEK_STEP_SEC))}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <Forward10Icon />
              </IconButton>
            </Tooltip>

            <Tooltip title={muted ? "Unmute" : "Mute"}>
              <IconButton
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={() => void withPlayer((p) => toggleMute(p))}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                {muted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
            </Tooltip>

            <Slider
              aria-label="Volume"
              value={muted ? 0 : volume}
              min={0}
              max={100}
              onChange={(_, value) => {
                const v = Array.isArray(value) ? value[0] : value;
                setVolume(v);
                setMuted(v === 0);
              }}
              onChangeCommitted={(_, value) => {
                const v = Array.isArray(value) ? value[0] : value;
                void withPlayer((p) => setPlayerVolume(p, v));
              }}
              sx={{ width: 88, mx: 0.5 }}
              size="small"
            />

            <Tooltip title={captionsOn ? "Captions off" : "Captions on"}>
              <IconButton
                aria-label={captionsOn ? "Turn captions off" : "Turn captions on"}
                onClick={() => void withPlayer((p) => toggleCaptions(p))}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                {captionsOn ? (
                  <ClosedCaptionIcon />
                ) : (
                  <ClosedCaptionOffIcon />
                )}
              </IconButton>
            </Tooltip>

            {qualities.length > 0 ? (
              <Select
                size="small"
                value={quality}
                aria-label="Video quality"
                onChange={(e) => {
                  const next = e.target.value;
                  setQuality(next);
                  void withPlayer((p) => setPlaybackQuality(p, next));
                }}
                sx={{ minWidth: 88, height: 36 }}
              >
                {qualities.map((q) => (
                  <MenuItem key={q} value={q}>
                    {formatPlaybackQuality(q)}
                  </MenuItem>
                ))}
              </Select>
            ) : null}

            <Tooltip title="Copy YouTube URL">
              <IconButton
                aria-label="Copy YouTube URL"
                onClick={() => void handleCopyUrl()}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      ) : null}

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
