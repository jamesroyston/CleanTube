"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useSavedChannels } from "@/context/SavedChannelsContext";
import { channelPageHrefFromToken } from "@/lib/youtubeUrl";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
import type { SavedChannel } from "@/types/savedChannel";

function SavedChannelRow({
  channel,
  onRemove,
}: {
  channel: SavedChannel;
  onRemove: () => void;
}) {
  const kind = effectiveSavedChannelKind(channel);
  const href =
    kind === "pinned_search"
      ? `/?q=${encodeURIComponent(channel.searchQuery)}`
      : channel.channelId
        ? channelPageHrefFromToken(channel.channelId)
        : channel.channelUrl?.trim() ||
          `/?q=${encodeURIComponent(channel.searchQuery)}`;

  return (
    <ListItem
      secondaryAction={
        <IconButton edge="end" aria-label={`Remove ${channel.name}`} onClick={onRemove}>
          <DeleteOutlineIcon />
        </IconButton>
      }
      disablePadding
      sx={{ py: 0.5 }}
    >
      <Box
        component="a"
        href={href}
        sx={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          textDecoration: "none",
          color: "inherit",
          pr: 6,
        }}
      >
        <ListItemAvatar>
          <Avatar src={channel.thumbnailUrl} sx={{ width: 40, height: 40 }}>
            {channel.name.slice(0, 1).toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={channel.name}
          secondary={
            kind === "saved_channel"
              ? "Saved channel"
              : `Pinned search: ${channel.searchQuery}`
          }
          primaryTypographyProps={{ noWrap: true }}
          secondaryTypographyProps={{ noWrap: true }}
        />
      </Box>
    </ListItem>
  );
}

export function LibraryManageClient() {
  const { channels, removeChannel } = useSavedChannels();
  const savedChannels = channels
    .filter((c) => effectiveSavedChannelKind(c) === "saved_channel")
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  const savedSearches = channels.filter(
    (c) => effectiveSavedChannelKind(c) === "pinned_search",
  );

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Remove pins you no longer need. Opening an item still works from the sidebar
        without deleting it here.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <SubscriptionsIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Saved channels
          </Typography>
        </Stack>
        {savedChannels.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None yet. Save a channel from its channel page.
          </Typography>
        ) : (
          <List disablePadding>
            {savedChannels.map((c) => (
              <SavedChannelRow key={c.id} channel={c} onRemove={() => removeChannel(c.id)} />
            ))}
          </List>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Pinned searches
        </Typography>
        {savedSearches.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None yet. Pin a query from search results.
          </Typography>
        ) : (
          <List disablePadding>
            {savedSearches.map((c) => (
              <SavedChannelRow key={c.id} channel={c} onRemove={() => removeChannel(c.id)} />
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}
