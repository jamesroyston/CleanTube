"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";

type ChannelGridEmptyStateProps = {
  hint: "try_again" | "likely_empty";
  partialLoad?: boolean;
};

export function ChannelGridEmptyState({
  hint,
  partialLoad,
}: ChannelGridEmptyStateProps) {
  const router = useRouter();

  if (hint === "likely_empty") {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        No videos found for this channel.
      </Typography>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 4 }}>
      <Typography color="text.secondary">
        We couldn&apos;t load videos for this channel right now. Try again, or
        open the account menu and switch &quot;Channel videos&quot; to Stable
        (legacy).
      </Typography>
      {partialLoad ? (
        <Typography variant="body2" color="text.secondary">
          This page may be missing older uploads because pagination stopped early.
        </Typography>
      ) : null}
      <Button variant="outlined" onClick={() => router.refresh()}>
        Retry
      </Button>
    </Stack>
  );
}
