"use client";

import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import Link from "next/link";

import { useSavedChannels } from "@/context/SavedChannelsContext";
import { savedChannelBrowseHref } from "@/lib/savedChannelNavigation";
import { effectiveSavedChannelKind } from "@/types/savedChannel";

export {
  CHANNELS_COLLAPSED_DRAWER_WIDTH,
  CHANNELS_DRAWER_WIDTH,
} from "@/theme/layout";

/** Shared transition easing with MUI mini-variant drawer demos. */
export function drawerRailTransition(theme: Theme) {
  return theme.transitions.create(
    ["width", "margin", "margin-left", "left"],
    {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    },
  );
}

type ChannelsRailContentProps = {
  miniMode: boolean;
  onNavigate?: () => void;
};

export function ChannelsRailContent({
  miniMode,
  onNavigate,
}: ChannelsRailContentProps) {
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

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          minWidth: 0,
          overflow: "auto",
          px: miniMode ? 0.5 : 1,
          py: 1,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <List disablePadding sx={{ mb: 1 }}>
          {!miniMode ? (
            <ListItemButton
              component={Link}
              href="/"
              onClick={onNavigate}
              sx={{
                borderRadius: 1,
                minHeight: 44,
                justifyContent: "flex-start",
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: "text.secondary",
                  justifyContent: "center",
                }}
              >
                <HomeOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          ) : null}
          {navLinks.map((item) => (
            <Tooltip
              key={item.href}
              title={miniMode ? item.label : ""}
              placement="right"
            >
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={onNavigate}
                sx={{
                  borderRadius: 1,
                  minHeight: 44,
                  justifyContent: miniMode ? "center" : "flex-start",
                  px: miniMode ? 1 : undefined,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: miniMode ? 0 : 36,
                    color: "text.secondary",
                    justifyContent: "center",
                    m: miniMode ? 0 : undefined,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!miniMode ? <ListItemText primary={item.label} /> : null}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        <Divider sx={{ my: 1 }} />

        {!miniMode ? (
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
          !miniMode ? (
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
                  href={savedChannelBrowseHref(c)}
                  onClick={onNavigate}
                  sx={{
                    borderRadius: 1,
                    py: miniMode ? 0.5 : 0.75,
                    justifyContent: miniMode ? "center" : "flex-start",
                  }}
                >
                  {miniMode ? (
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
            {!miniMode ? (
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
                    href={savedChannelBrowseHref(c)}
                    onClick={onNavigate}
                    sx={{
                      borderRadius: 1,
                      py: miniMode ? 0.5 : 0.75,
                      justifyContent: miniMode ? "center" : "flex-start",
                    }}
                  >
                    {miniMode ? (
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
        <Tooltip title={miniMode ? "Manage library" : ""} placement="right">
          <ListItemButton
            component={Link}
            href="/library/manage"
            onClick={onNavigate}
            sx={{
              borderRadius: 1,
              justifyContent: miniMode ? "center" : "flex-start",
            }}
          >
            {miniMode ? (
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
}
