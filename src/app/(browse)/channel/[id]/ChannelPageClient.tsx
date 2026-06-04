"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ChannelBrowsePage } from "@/app/(browse)/channel/[id]/ChannelBrowsePage";
import { useChannelPage } from "@/hooks/useChannelPage";
import type { ChannelSortMode } from "@/lib/youtubeTypes";

export type ChannelPageClientProps = {
  channelId: string;
  sort: ChannelSortMode;
  pageRaw?: string;
  gridQuery?: string;
};

function ChannelPageSkeleton() {
  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Skeleton variant="rectangular" sx={{ width: "100%", height: { xs: 140, sm: 200 } }} />
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={40} width="40%" />
          <Stack direction="row" spacing={2}>
            <Skeleton variant="rounded" width={160} height={90} />
            <Skeleton variant="rounded" width={160} height={90} />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

export function ChannelPageClient({
  channelId,
  sort,
  pageRaw,
  gridQuery,
}: ChannelPageClientProps) {
  const router = useRouter();
  const {
    page,
    redirect,
    error,
    isInitialLoad,
    isSessionFallback,
    refresh,
  } = useChannelPage({ channelId, sort, pageRaw });

  useEffect(() => {
    if (redirect) {
      router.replace(redirect);
    }
  }, [redirect, router]);

  if (redirect) {
    return <ChannelPageSkeleton />;
  }

  if (page) {
    return (
      <ChannelBrowsePage
        page={page}
        sort={sort}
        gridQuery={gridQuery}
        stale={isSessionFallback}
      />
    );
  }

  if (isInitialLoad) {
    return <ChannelPageSkeleton />;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Not found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {error ??
            "That channel could not be loaded right now, and there is no cached copy in this browser session."}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button variant="outlined" onClick={() => void refresh()}>
            Retry
          </Button>
          <Button component={Link} href="/" variant="contained">
            Back home
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
