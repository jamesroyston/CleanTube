"use client";

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { LibraryHubMobile } from "@/components/LibraryHubMobile";
import { LibraryManageClient } from "@/components/LibraryManageClient";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { useMobileExperience } from "@/hooks/useMobileExperience";

export function LibraryPageClient() {
  const mobileExperience = useMobileExperience();
  const { canPersistLibrary, refreshLibrary } = useCloudLibrary();

  if (mobileExperience) {
    return (
      <PullToRefresh disabled={!canPersistLibrary} onRefresh={refreshLibrary}>
        <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
          <LibraryHubMobile />
        </Container>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh disabled={!canPersistLibrary} onRefresh={refreshLibrary}>
      <Container maxWidth="sm" sx={{ pt: 3, pb: 6 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
          Manage library
        </Typography>
        <LibraryManageClient />
      </Container>
    </PullToRefresh>
  );
}
