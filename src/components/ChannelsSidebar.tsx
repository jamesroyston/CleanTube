"use client";

import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";

import { useSavedChannels } from "@/context/SavedChannelsContext";
import { getLastSearchSort } from "@/lib/lastSearchSession";
import { channelPageHrefFromToken } from "@/lib/youtubeUrl";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { SavedChannel } from "@/types/savedChannel";

export const CHANNELS_DRAWER_WIDTH = 280;
export const CHANNELS_COLLAPSED_DRAWER_WIDTH = 72;

type ChannelsSidebarProps = {
  surface: "permanent" | "temporary";
  /** Narrow rail: icons + channel avatars only (desktop permanent). */
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
  toolbarOffset: number;
  sx?: SxProps<Theme>;
};

export function ChannelsSidebar({
  surface,
  collapsed,
  open,
  onClose,
  toolbarOffset,
  sx,
}: ChannelsSidebarProps) {
  const { channels } = useSavedChannels();
  const savedChannels = channels
    .filter((channel) => effectiveSavedChannelKind(channel) === "saved_channel")
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  const savedSearches = channels.filter(
    (channel) => effectiveSavedChannelKind(channel) === "pinned_search",
  );
  const mini = surface === "permanent" && collapsed;
  const drawerWidth =
    surface === "permanent"
      ? mini
        ? CHANNELS_COLLAPSED_DRAWER_WIDTH
        : CHANNELS_DRAWER_WIDTH
      : CHANNELS_DRAWER_WIDTH;

  function searchHref(q: string) {
    const searchSort = getLastSearchSort();
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (searchSort !== "relevance") qs.set("searchSort", searchSort);
    return `/?${qs.toString()}`;
  }

  function savedLibraryHref(channel: SavedChannel): string {
    const kind = effectiveSavedChannelKind(channel);
    if (kind === "pinned_search") return searchHref(channel.searchQuery);
    if (channel.channelId) return channelPageHrefFromToken(channel.channelId);
    const url = channel.channelUrl?.trim();
    if (url) return url;
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
      <Box sx={{ flex: 1, overflow: "auto", px: mini ? 0.5 : 1, py: 1 }}>
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
                  px: mini ? 1 : undefined,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: mini ? 0 : 36,
                    color: "text.secondary",
                    justifyContent: "center",
                    m: mini ? 0 : undefined,
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

        {!mini ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: 1,
              px: 0.5,
            }}
          >
            <SubscriptionsIcon color="action" fontSize="small" />
            <Typography
              variant="overline"
              sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}
            >
              Saved channels
            </Typography>
          </Box>
        ) : null}
        {savedChannels.length === 0 ? (
          !mini ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 1, py: 1 }}
            >
              Save channels from a channel page to pin them here.
            </Typography>
          ) : null
        ) : (
          <List disablePadding sx={{ mb: 1 }}>
            {savedChannels.map((c) => (
              <Tooltip key={c.id} title={c.name} placement="right" enterDelay={400}>
                <ListItemButton
                  component={Link}
                  href={savedLibraryHref(c)}
                  onClick={onClose}
                  sx={{
                    borderRadius: 1,
                    py: mini ? 0.5 : 0.75,
                    justifyContent: mini ? "center" : "flex-start",
                  }}
                >
                  {mini ? (
                    <Avatar
                      src={c.thumbnailUrl}
                      alt=""
                      sx={{ width: 36, height: 36 }}
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </Avatar>
                  ) : (
                    <>
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar
                          src={c.thumbnailUrl}
                          alt=""
                          sx={{ width: 32, height: 32 }}
                        >
                          {c.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={c.name}
                        secondary={
                          c.searchQuery !== c.name
                            ? `Search: ${c.searchQuery}`
                            : null
                        }
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </>
                  )}
                </ListItemButton>
              </Tooltip>
            ))}
          </List>
        )}

        {savedSearches.length > 0 ? (
          <>
            <Divider sx={{ my: 1 }} />
            {!mini ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mb: 1,
                  px: 0.5,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ lineHeight: 1.2, letterSpacing: 0.08 }}
                >
                  Pinned searches
                </Typography>
              </Box>
            ) : null}
            <List disablePadding>
              {savedSearches.map((c) => (
                <Tooltip key={c.id} title={c.name} placement="right" enterDelay={400}>
                  <ListItemButton
                    component={Link}
                    href={searchHref(c.searchQuery)}
                    onClick={onClose}
                    sx={{
                      borderRadius: 1,
                      py: mini ? 0.5 : 0.75,
                      justifyContent: mini ? "center" : "flex-start",
                    }}
                  >
                    {mini ? (
                      <Avatar sx={{ width: 36, height: 36 }}>
                        {c.name.slice(0, 1).toUpperCase()}
                      </Avatar>
                    ) : (
                      <>
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {c.name.slice(0, 1).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={c.name}
                          secondary={
                            c.searchQuery !== c.name
                              ? `Query: ${c.searchQuery}`
                              : null
                          }
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </>
                    )}
                  </ListItemButton>
                </Tooltip>
              ))}
            </List>
          </>
        ) : null}

        <Divider sx={{ my: 2 }} />
        <Tooltip title={mini ? "Manage library" : ""} placement="right">
          <ListItemButton
            component={Link}
            href="/library"
            onClick={onClose}
            sx={{
              borderRadius: 1,
              justifyContent: mini ? "center" : "flex-start",
            }}
          >
            {mini ? (
              <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                <SettingsOutlinedIcon fontSize="small" color="action" />
              </ListItemIcon>
            ) : (
              <ListItemText
                primary="Manage saved channels & searches"
                secondary="Remove or review pins"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  if (surface === "permanent") {
    return (
      <Drawer
        variant="permanent"
        open
        sx={[
          {
            width: drawerWidth,
            flexShrink: 0,
            height: "100%",
            alignSelf: "stretch",
            display: { xs: "none", md: "block" },
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: "border-box",
              position: "relative",
              height: "100%",
              borderRight: (t) => `1px solid ${t.palette.divider}`,
              overflowX: "hidden",
              transition: (t) =>
                t.transitions.create("width", {
                  easing: t.transitions.easing.sharp,
                  duration: t.transitions.duration.enteringScreen,
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

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
        sx: {
          zIndex: (t) => t.zIndex.appBar - 1,
        },
        slotProps: {
          backdrop: {
            sx: {
              top: `${toolbarOffset}px`,
            },
          },
        },
      }}
      sx={[
        {
          zIndex: (t) => t.zIndex.appBar - 1,
          display: { xs: "block", md: "none" },
          [`& .MuiDrawer-paper`]: {
            width: CHANNELS_DRAWER_WIDTH,
            boxSizing: "border-box",
            mt: `${toolbarOffset}px`,
            height: `calc(100% - ${toolbarOffset}px)`,
            borderRight: (t) => `1px solid ${t.palette.divider}`,
            overflowX: "hidden",
            borderRadius: 0,
          },
        },
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      {drawer}
    </Drawer>
  );
}
