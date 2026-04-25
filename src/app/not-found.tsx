"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Not found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            That video does not exist or could not be loaded.
          </Typography>
          <Button component={Link} href="/" variant="contained">
            Back to search
          </Button>
        </Box>
      </Container>
    </AppShell>
  );
}
