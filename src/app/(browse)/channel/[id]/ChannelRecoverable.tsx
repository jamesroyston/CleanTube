"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo } from "react";

import { ChannelBrowsePage } from "./ChannelBrowsePage";
import {
  buildChannelPageCacheKey,
  readChannelPageCache,
} from "@/lib/channelPageClientCache";
import type { ChannelSortMode } from "@/lib/youtubeTypes";

type ChannelRecoverableProps = {
  channelId: string;
  sort: ChannelSortMode;
  pageRaw?: string;
  gridQuery?: string;
};

export function ChannelRecoverable({
  channelId,
  sort,
  pageRaw,
  gridQuery,
}: ChannelRecoverableProps) {
  const cacheKey = useMemo(
    () =>
      buildChannelPageCacheKey({
        channelId,
        sort,
        pageToken: pageRaw,
      }),
    [channelId, sort, pageRaw],
  );

  const cached = readChannelPageCache(cacheKey);

  if (cached) {
    return (
      <ChannelBrowsePage
        page={cached}
        sort={sort}
        gridQuery={gridQuery}
        stale
      />
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Not found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          That channel could not be loaded right now, and there is no cached copy in
          this browser session.
        </Typography>
        <Button component={Link} href="/" variant="contained">
          Back to search
        </Button>
      </Box>
    </Container>
  );
}
