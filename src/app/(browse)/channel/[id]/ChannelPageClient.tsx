"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ChannelBrowsePage } from "@/app/(browse)/channel/[id]/ChannelBrowsePage";
import { VideoCardGridSkeleton } from "@/components/skeletons/VideoCardGridSkeleton";
import { useChannelPage } from "@/hooks/useChannelPage";

export type ChannelPageClientProps = {
  channelId: string;
  pageRaw?: string;
};

export function ChannelPageSkeleton() {
  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Skeleton variant="circular" width={80} height={80} />
            <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="55%" height={36} />
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="70%" />
            </Stack>
            <Skeleton variant="rounded" width={120} height={36} />
          </Stack>
        </Paper>

        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mb: 2 }}
        >
          <Skeleton variant="rounded" width={160} height={32} />
        </Stack>

        <VideoCardGridSkeleton count={8} />
      </Container>
    </Box>
  );
}

export function ChannelPageClient({
  channelId,
  pageRaw,
}: ChannelPageClientProps) {
  const router = useRouter();
  const {
    page,
    redirect,
    error,
    isInitialLoad,
    isRefreshing,
    isPageTransitioning,
    isPageSynced,
    refresh,
  } = useChannelPage({ channelId, pageRaw });

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
        pageRaw={pageRaw}
        isRefreshing={isRefreshing}
        isPageTransitioning={isPageTransitioning}
        isPageSynced={isPageSynced}
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
            "That channel could not be loaded right now, and there is no cached copy in this browser."}
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
