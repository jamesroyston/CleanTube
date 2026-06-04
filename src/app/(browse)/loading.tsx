import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

/** Instant shell while App Router loads the next browse page. */
export default function BrowseLoading() {
  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={40} width="42%" />
          <Skeleton variant="rounded" height={120} />
          <Stack direction="row" spacing={2}>
            <Skeleton variant="rounded" width={160} height={90} />
            <Skeleton variant="rounded" width={160} height={90} />
            <Skeleton variant="rounded" width={160} height={90} sx={{ display: { xs: "none", sm: "block" } }} />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
