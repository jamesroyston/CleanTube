"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

function VideoCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: "100%", overflow: "hidden" }}>
      <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio: "16/9" }} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton variant="text" width="90%" height={24} />
        <Skeleton variant="text" width="60%" height={20} />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Skeleton variant="rounded" width={72} height={22} />
          <Skeleton variant="text" width={80} height={20} />
        </Stack>
      </Box>
    </Card>
  );
}

export function SearchResultsSkeleton() {
  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <Skeleton variant="text" width={280} height={28} sx={{ flex: "1 1 auto" }} />
        <Skeleton variant="rounded" width={200} height={40} />
      </Stack>
      <Grid container spacing={2.5}>
        {Array.from({ length: 8 }, (_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <VideoCardSkeleton />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
