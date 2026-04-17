"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { WatchProgressBar } from "@/components/WatchProgressBar";
import { HoverMarqueeTitle } from "@/components/HoverMarqueeTitle";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useSavedChannels } from "@/context/SavedChannelsContext";
import { useWatchLater } from "@/context/WatchLaterContext";
import { getLastSearchSort } from "@/lib/lastSearchSession";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";

const DRAWER_WIDTH = 280;

function formatStartLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}:${String(r).padStart(2, "0")}`;
  return `${s}s`;
}

type ChannelsSidebarProps = {
  variant: "permanent" | "temporary";
  open: boolean;
  onClose: () => void;
};

export function ChannelsSidebar({
  variant,
  open,
  onClose,
}: ChannelsSidebarProps) {
  const router = useRouter();
  const { channels, addChannel, removeChannel } = useSavedChannels();
  const { entries, removeByVideoId } = useWatchLater();
  const { inProgressEntries, getResumeSeconds } = useCloudLibrary();
  const [draft, setDraft] = useState("");

  function quickSearch(q: string) {
    const sort = getLastSearchSort();
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (sort !== "relevance") qs.set("sort", sort);
    router.push(`/?${qs.toString()}`);
    onClose();
  }

  function openWatchLaterVideo(e: {
    videoId: string;
    startSeconds?: number;
  }) {
    const resumeSeconds = getResumeSeconds(e.videoId, e.startSeconds);
    const qs =
      resumeSeconds != null && resumeSeconds > 0
        ? `?t=${encodeURIComponent(String(Math.floor(resumeSeconds)))}`
        : "";
    router.push(`/watch/${e.videoId}${qs}`);
    onClose();
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    addChannel({ name: v, searchQuery: v });
    setDraft("");
  }

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 64 },
          borderBottom: 1,
          borderColor: "divider",
          gap: 1,
        }}
      >
        <SubscriptionsIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Library
        </Typography>
      </Toolbar>
      <Box sx={{ flex: 1, overflow: "auto", px: 1, py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, px: 0.5 }}>
          <HistoryOutlinedIcon color="action" fontSize="small" />
          <Typography variant="overline" sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}>
            History
          </Typography>
        </Box>
        {inProgressEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 2 }}>
            Start a video and your in-progress history will appear here.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
            {inProgressEntries.slice(0, 5).map((entry) => (
              <Box
                key={entry.videoId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  borderRadius: 1,
                  p: 0.5,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 72,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 0.5,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                  }}
                >
                  <YouTubeThumbnailImage
                    src={entry.thumbnailUrl}
                    fallbacks={youtubeThumbnailFallbackUrls(
                      entry.videoId,
                      undefined,
                      entry.thumbnailUrl,
                    )}
                    alt=""
                    fill
                    sizes="72px"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HoverMarqueeTitle text={entry.title} variant="body2" />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {entry.channelName}
                  </Typography>
                  <WatchProgressBar
                    positionSeconds={entry.lastPositionSeconds}
                    durationSeconds={entry.durationSeconds}
                  />
                </Box>
                <IconButton
                  size="small"
                  aria-label={`Resume ${entry.title}`}
                  onClick={() =>
                    openWatchLaterVideo({
                      videoId: entry.videoId,
                      startSeconds: entry.lastPositionSeconds,
                    })
                  }
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              variant="text"
              onClick={() => {
                router.push("/history");
                onClose();
              }}
            >
              View full history
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, px: 0.5 }}>
          <WatchLaterOutlinedIcon color="action" fontSize="small" />
          <Typography variant="overline" sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}>
            Watch later
          </Typography>
        </Box>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 2 }}>
            Add videos from search results or while watching.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
            {entries.map((e) => (
              <Box
                key={e.entryId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  borderRadius: 1,
                  p: 0.5,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 72,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 0.5,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                  }}
                >
                  <YouTubeThumbnailImage
                    src={e.thumbnailUrl}
                    fallbacks={youtubeThumbnailFallbackUrls(
                      e.videoId,
                      undefined,
                      e.thumbnailUrl,
                    )}
                    alt=""
                    fill
                    sizes="72px"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <HoverMarqueeTitle text={e.title} variant="body2" />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {e.channelName}
                    {e.startSeconds != null && e.startSeconds > 0
                      ? ` · ${formatStartLabel(e.startSeconds)}`
                      : ""}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label={`Play ${e.title}`}
                  onClick={() => openWatchLaterVideo(e)}
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`Remove ${e.title}`}
                  onClick={() => removeByVideoId(e.videoId)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, px: 0.5 }}>
          <SubscriptionsIcon color="action" fontSize="small" />
          <Typography variant="overline" sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}>
            Saved channels
          </Typography>
        </Box>
        {channels.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
            Add channels from a video page or type a name below to pin quick
            searches.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {channels.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  component="button"
                  type="button"
                  onClick={() => quickSearch(c.searchQuery)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    border: 0,
                    background: "none",
                    font: "inherit",
                    color: "inherit",
                    p: 0,
                    m: 0,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {c.name}
                  </Typography>
                  {c.searchQuery !== c.name ? (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Search: {c.searchQuery}
                    </Typography>
                  ) : null}
                </Box>
                <IconButton
                  aria-label={`Search ${c.name}`}
                  size="small"
                  onClick={() => quickSearch(c.searchQuery)}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Remove ${c.name}`}
                  size="small"
                  onClick={() => removeChannel(c.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <Divider />
      <Box component="form" onSubmit={handleAdd} sx={{ p: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          Add channel (name or @handle)
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="e.g. Computerphile"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ minWidth: "auto", px: 1.5 }}
            aria-label="Add channel"
          >
            <AddIcon />
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          borderRight: (t) => `1px solid ${t.palette.divider}`,
        },
      }}
    >
      {drawer}
    </Drawer>
  );
}

export const CHANNELS_DRAWER_WIDTH = DRAWER_WIDTH;
