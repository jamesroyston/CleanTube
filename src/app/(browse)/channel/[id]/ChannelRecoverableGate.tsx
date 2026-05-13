"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";

import type { ChannelSortMode } from "@/lib/youtubeTypes";

const ChannelRecoverable = dynamic(
  () => import("./ChannelRecoverable").then((m) => m.ChannelRecoverable),
  {
    ssr: false,
    loading: () => (
      <Box component="main" sx={{ pb: 6, minHeight: "40vh" }}>
        <Container maxWidth="sm" sx={{ pt: 4 }}>
          <Typography color="text.secondary">Checking for a cached copy…</Typography>
        </Container>
      </Box>
    ),
  },
);

export type ChannelRecoverableGateProps = {
  channelId: string;
  sort: ChannelSortMode;
  pageRaw?: string;
  gridQuery?: string;
};

export function ChannelRecoverableGate(props: ChannelRecoverableGateProps) {
  return <ChannelRecoverable {...props} />;
}
