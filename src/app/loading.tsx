import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import { SearchResultsSkeleton } from "@/components/SearchResultsSkeleton";

export default function Loading() {
  return (
    <Box component="main" sx={{ pb: 6, minHeight: "100vh" }}>
      <Container maxWidth="xl" sx={{ pt: 2 }}>
        <SearchResultsSkeleton />
      </Container>
    </Box>
  );
}
