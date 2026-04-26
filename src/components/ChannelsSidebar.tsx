"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";

import { useSavedChannels } from "@/context/SavedChannelsContext";
import { getLastSearchSort } from "@/lib/lastSearchSession";
import { channelPageHrefFromToken } from "@/lib/youtubeUrl";
import type { SavedChannel } from "@/types/savedChannel";

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 72;

type ChannelsSidebarProps = {
  variant: "permanent" | "temporary";
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  sx?: SxProps<Theme>;
};

export function ChannelsSidebar({
  variant,
  open,
  onClose,
  collapsed = false,
  sx,
}: ChannelsSidebarProps) {
  const { channels, removeChannel } = useSavedChannels();
  const mini = collapsed && variant === "permanent";
  const drawerWidth = mini ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;
  const savedChannels = channels.filter((channel) => channel.channelId);
  const savedSearches = channels.filter((channel) => !channel.channelId);

  function searchHref(q: string) {
    const searchSort = getLastSearchSort();
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (searchSort !== "relevance") qs.set("searchSort", searchSort);
    return `/?${qs.toString()}`;
  }

  function savedChannelHref(channel: SavedChannel) {
    if (channel.channelId) return channelPageHrefFromToken(channel.channelId);
    return searchHref(channel.searchQuery);
  }

  const navLinks = [
    {
      href: "/history",
      label: "History",
      icon: <HistoryOutlinedIcon fontSize="small" />,
    },
    {
      href: "/watch-later",
      label: "Watch Later",
      icon: <WatchLaterOutlinedIcon fontSize="small" />,
    },
  ];

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 64 },
          borderBottom: 1,
          borderColor: "divider",
          justifyContent: mini ? "center" : "flex-start",
          gap: 1,
        }}
      >
        <SubscriptionsIcon color="primary" />
        {!mini ? (
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Library
          </Typography>
        ) : null}
      </Toolbar>
      <Box sx={{ flex: 1, overflow: "auto", px: 1, py: 1 }}>
        <List disablePadding sx={{ mb: 1 }}>
          {navLinks.map((item) => (
            <Tooltip
              key={item.href}
              title={mini ? item.label : ""}
              placement="right"
            >
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={onClose}
                sx={{
                  borderRadius: 1,
                  minHeight: 44,
                  justifyContent: mini ? "center" : "flex-start",
                  px: mini ? 1 : 1.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: mini ? 0 : 36,
                    color: "text.secondary",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!mini ? <ListItemText primary={item.label} /> : null}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, px: 0.5 }}>
          <SubscriptionsIcon color="action" fontSize="small" />
          {!mini ? (
            <Typography variant="overline" sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}>
              Saved channels
            </Typography>
          ) : null}
        </Box>
        {savedChannels.length === 0 ? (
          !mini ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
              Save channels from a channel page to pin them here.
            </Typography>
          ) : null
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {savedChannels.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  borderRadius: 1,
                  px: mini ? 0 : 1,
                  py: 0.5,
                  justifyContent: mini ? "center" : "flex-start",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {!mini ? (
                  <Box
                    component={Link}
                    href={savedChannelHref(c)}
                    onClick={onClose}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      border: 0,
                      background: "none",
                      font: "inherit",
                      color: "inherit",
                      textDecoration: "none",
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
                ) : null}
                <IconButton
                  aria-label={`Open ${c.name}`}
                  component={Link}
                  href={savedChannelHref(c)}
                  size="small"
                  onClick={onClose}
                >
                  <Tooltip title={mini ? c.name : ""} placement="right">
                    <SearchIcon fontSize="small" />
                  </Tooltip>
                </IconButton>
                {!mini ? (
                  <IconButton
                    aria-label={`Remove ${c.name}`}
                    size="small"
                    onClick={() => removeChannel(c.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Box>
            ))}
          </Box>
        )}

        {savedSearches.length > 0 ? (
          <>
            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, px: 0.5 }}>
              <SearchIcon color="action" fontSize="small" />
              {!mini ? (
                <Typography variant="overline" sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}>
                  Pinned searches
                </Typography>
              ) : null}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {savedSearches.map((c) => (
                <Box
                  key={c.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    borderRadius: 1,
                    px: mini ? 0 : 1,
                    py: 0.5,
                    justifyContent: mini ? "center" : "flex-start",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {!mini ? (
                    <Box
                      component={Link}
                      href={searchHref(c.searchQuery)}
                      onClick={onClose}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        border: 0,
                        background: "none",
                        font: "inherit",
                        color: "inherit",
                        textDecoration: "none",
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
                  ) : null}
                  <IconButton
                    aria-label={`Search ${c.name}`}
                    component={Link}
                    href={searchHref(c.searchQuery)}
                    size="small"
                    onClick={onClose}
                  >
                    <Tooltip title={mini ? c.name : ""} placement="right">
                      <SearchIcon fontSize="small" />
                    </Tooltip>
                  </IconButton>
                  {!mini ? (
                    <IconButton
                      aria-label={`Remove ${c.name}`}
                      size="small"
                      onClick={() => removeChannel(c.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Box>
              ))}
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={[
        {
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: (t) => `1px solid ${t.palette.divider}`,
            overflowX: "hidden",
            transition: (t) =>
              t.transitions.create("width", {
                easing: t.transitions.easing.sharp,
                duration: t.transitions.duration.shorter,
              }),
          },
        },
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      {drawer}
    </Drawer>
  );
}

export const CHANNELS_DRAWER_WIDTH = DRAWER_WIDTH;
export const CHANNELS_COLLAPSED_DRAWER_WIDTH = COLLAPSED_DRAWER_WIDTH;
