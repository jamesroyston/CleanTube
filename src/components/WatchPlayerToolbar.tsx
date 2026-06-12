"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Forward10Icon from "@mui/icons-material/Forward10";
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
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  isPlayerPlaying,
  resolveLiteYoutubePlayer,
  SEEK_STEP_SEC,
  toggleMute,
  togglePlayPause,
  seekRelative,
} from "@/lib/youtubePlayerControls";
import {
  readWatchPlayerToolbarVisible,
  writeWatchPlayerToolbarVisible,
} from "@/lib/watchPlayerToolbarPersistence";

type WatchPlayerToolbarProps = {
  videoId: string;
  playerShellRef: RefObject<HTMLElement | null>;
  playerApiReady: boolean;
};

/** Comfortable tap targets — well above the 44px iOS minimum. */
const TOUCH_TARGET_SX = { width: 52, height: 52 } as const;

export function WatchPlayerToolbar({
  playerShellRef,
  playerApiReady,
}: WatchPlayerToolbarProps) {
  const [expanded, setExpanded] = useState(() => readWatchPlayerToolbarVisible());
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const syncFromPlayer = useCallback(async () => {
    const player = await resolveLiteYoutubePlayer(playerShellRef.current);
    if (!player) return;
    setPlaying(isPlayerPlaying(player));
    try {
      setMuted(player.isMuted());
    } catch {
      setMuted(false);
    }
  }, [playerShellRef]);

  const withPlayer = useCallback(
    async (fn: (player: YT.Player) => void | Promise<void>) => {
      const player = await resolveLiteYoutubePlayer(playerShellRef.current);
      if (!player) return;
      await fn(player);
      void syncFromPlayer();
    },
    [playerShellRef, syncFromPlayer],
  );

  useEffect(() => {
    if (!playerApiReady) return;
    void syncFromPlayer();
    const id = window.setInterval(() => {
      void syncFromPlayer();
    }, 1000);
    return () => window.clearInterval(id);
  }, [playerApiReady, syncFromPlayer]);

  const setExpandedPersisted = (next: boolean) => {
    setExpanded(next);
    writeWatchPlayerToolbarVisible(next);
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
        </Stack>
      </Paper>
    </Box>
  );
}
