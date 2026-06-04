import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import { LibraryManageClient } from "@/components/LibraryManageClient";
import { MobilePageHeader } from "@/components/MobilePageHeader";

export const metadata = {
  title: "Manage library — CleanTube",
};

export default function LibraryManagePage() {
  return (
    <Box component="main">
      <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 }, pb: 6 }}>
        <MobilePageHeader title="Manage library" backHref="/library" />
        <LibraryManageClient />
      </Container>
    </Box>
  );
}
