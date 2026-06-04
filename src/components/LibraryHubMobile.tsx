"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo } from "react";

import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { LibrarySignInPrompt } from "@/components/LibrarySignInPrompt";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useSavedChannels } from "@/context/SavedChannelsContext";
import { useWatchLater } from "@/context/WatchLaterContext";
import {
  compactMainPaddingBottom,
  useShowBottomNav,
} from "@/hooks/useCompactViewport";
import { savedChannelBrowseHref } from "@/lib/savedChannelNavigation";
import { watchNavigationCaptureHandlers } from "@/lib/watchReturnNavigation";
import { effectiveSavedChannelKind } from "@/types/savedChannel";

const PREVIEW_LIMIT = 4;

function timestamp(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1.5 }}
    >
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Button
        component={Link}
        href={href}
        size="small"
        endIcon={<ChevronRightIcon />}
        sx={{ minWidth: 0 }}
      >
        {linkLabel}
      </Button>
    </Stack>
  );
}

export function LibraryHubMobile() {
  const showBottomNav = useShowBottomNav();
  const { canPersistLibrary, watchProgress, getResumeSeconds } = useCloudLibrary();
  const { entries: watchLaterEntries } = useWatchLater();
  const { channels } = useSavedChannels();

  const savedChannels = useMemo(
    () =>
      channels
        .filter((c) => effectiveSavedChannelKind(c) === "saved_channel")
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        ),
    [channels],
  );

  const savedSearches = useMemo(
    () =>
      channels.filter(
        (c) => effectiveSavedChannelKind(c) === "pinned_search",
      ),
    [channels],
  );

  const historyPreview = useMemo(
    () =>
      [...watchProgress]
        .sort((a, b) => timestamp(b.lastWatchedAt) - timestamp(a.lastWatchedAt))
        .slice(0, PREVIEW_LIMIT),
    [watchProgress],
  );

  const watchLaterPreview = useMemo(
    () =>
      [...watchLaterEntries]
        .sort((a, b) => timestamp(b.addedAt) - timestamp(a.addedAt))
        .slice(0, PREVIEW_LIMIT),
    [watchLaterEntries],
  );

  return (
    <Box sx={{ pb: compactMainPaddingBottom(showBottomNav, 24) ?? 3 }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 3 }}>
        Library
      </Typography>

      {!canPersistLibrary ? (
        <LibrarySignInPrompt
          title="Sign in to use your library"
          message="History, Watch Later, saved channels, and pinned searches sync to your account when you sign in."
        />
      ) : null}

      {canPersistLibrary && historyPreview.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <SectionHeader
            title="Continue watching"
            href="/history"
            linkLabel="History"
          />
          <ContinueWatchingRow entries={historyPreview} />
        </Box>
      ) : null}

      {canPersistLibrary ? (
        <>
          <Box sx={{ mb: 3 }}>
            <SectionHeader
              title="Watch Later"
              href="/watch-later"
              linkLabel="See all"
            />
            {watchLaterPreview.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Save videos from search or the watch page to queue them here.
              </Typography>
            ) : (
              <List component={Paper} variant="outlined" disablePadding>
                {watchLaterPreview.map((entry, index) => {
                  const resume = getResumeSeconds(entry.videoId, entry.startSeconds);
                  const href =
                    resume && resume > 0
                      ? `/watch/${entry.videoId}?t=${encodeURIComponent(String(resume))}`
                      : `/watch/${entry.videoId}`;
                  return (
                    <Box key={entry.entryId}>
                      {index > 0 ? <Divider component="li" /> : null}
                      <ListItemButton
                        component={Link}
                        href={href}
                        {...watchNavigationCaptureHandlers()}
                        sx={{ minHeight: 56 }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={entry.thumbnailUrl}
                            sx={{ width: 48, height: 36 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={entry.title}
                          secondary={entry.channelName}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <SectionHeader title="History" href="/history" linkLabel="See all" />
            {historyPreview.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Your watch history will appear here once you start watching.
              </Typography>
            ) : (
              <List component={Paper} variant="outlined" disablePadding>
                {historyPreview.map((entry, index) => {
                  const resume = getResumeSeconds(entry.videoId);
                  const href =
                    resume && resume > 0
                      ? `/watch/${entry.videoId}?t=${encodeURIComponent(String(resume))}`
                      : `/watch/${entry.videoId}`;
                  return (
                    <Box key={entry.videoId}>
                      {index > 0 ? <Divider component="li" /> : null}
                      <ListItemButton
                        component={Link}
                        href={href}
                        {...watchNavigationCaptureHandlers()}
                        sx={{ minHeight: 56 }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={entry.thumbnailUrl}
                            sx={{ width: 48, height: 36 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={entry.title}
                          secondary={entry.channelName}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        </>
      ) : null}

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <SubscriptionsIcon color="action" fontSize="small" />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            Saved channels
          </Typography>
        </Stack>
        {savedChannels.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Save channels from a channel page to pin them here.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {savedChannels.map((channel) => (
              <Grid key={channel.id} size={{ xs: 6, sm: 4 }}>
                <Paper
                  component={Link}
                  href={savedChannelBrowseHref(channel)}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    textDecoration: "none",
                    color: "inherit",
                    minHeight: 88,
                  }}
                >
                  <Avatar src={channel.thumbnailUrl} sx={{ width: 48, height: 48 }}>
                    {channel.name.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, textAlign: "center" }}
                    noWrap
                  >
                    {channel.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {savedSearches.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Pinned searches
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {savedSearches.map((search) => (
              <Chip
                key={search.id}
                component={Link}
                href={savedChannelBrowseHref(search)}
                label={search.name}
                clickable
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <List disablePadding>
          <ListItemButton component={Link} href="/history" sx={{ minHeight: 52 }}>
            <ListItemIcon>
              <HistoryOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="History" secondary="Resume where you left off" />
            <ChevronRightIcon color="action" />
          </ListItemButton>
          <Divider component="li" />
          <ListItemButton component={Link} href="/watch-later" sx={{ minHeight: 52 }}>
            <ListItemIcon>
              <WatchLaterOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Watch Later" secondary="Your saved queue" />
            <ChevronRightIcon color="action" />
          </ListItemButton>
          <Divider component="li" />
          <ListItemButton component={Link} href="/library/manage" sx={{ minHeight: 52 }}>
            <ListItemIcon>
              <SettingsOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="Manage library"
              secondary="Remove saved channels and pinned searches"
            />
            <ChevronRightIcon color="action" />
          </ListItemButton>
        </List>
      </Paper>
    </Box>
  );
}
