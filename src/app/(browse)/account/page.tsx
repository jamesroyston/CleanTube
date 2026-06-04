import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { Suspense } from "react";

import { AccountPageClient } from "@/components/AccountPageClient";

export const metadata = {
  title: "Account — CleanTube",
};

export default function AccountPage() {
  return (
    <Box component="main">
      <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
        <Suspense fallback={null}>
          <AccountPageClient />
        </Suspense>
      </Container>
    </Box>
  );
}
