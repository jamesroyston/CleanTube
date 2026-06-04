import Box from "@mui/material/Box";

import { LibraryPageClient } from "@/components/LibraryPageClient";

export const metadata = {
  title: "Library — CleanTube",
};

export default function LibraryPage() {
  return (
    <Box component="main">
      <LibraryPageClient />
    </Box>
  );
}
