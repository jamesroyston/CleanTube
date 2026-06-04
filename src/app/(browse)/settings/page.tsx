import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import { SettingsPageClient } from "@/components/SettingsPageClient";

export const metadata = {
  title: "Settings — CleanTube",
};

export default function SettingsPage() {
  return (
    <Box component="main">
      <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
        <SettingsPageClient />
      </Container>
    </Box>
  );
}
