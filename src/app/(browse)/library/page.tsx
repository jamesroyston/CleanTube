import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { LibraryManageClient } from "@/components/LibraryManageClient";

export const metadata = {
  title: "Library — CleanTube",
};

export default function LibraryPage() {
  return (
    <Box component="main" sx={{ pb: 6 }}>
      <Container maxWidth="sm" sx={{ pt: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
          Manage library
        </Typography>
        <LibraryManageClient />
      </Container>
    </Box>
  );
}
