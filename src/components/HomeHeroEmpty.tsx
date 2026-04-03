"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { RetroTvLogo } from "@/components/RetroTvLogo";

export function HomeHeroEmpty() {
  return (
    <Box
      sx={{
        py: 10,
        textAlign: "center",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <RetroTvLogo size={96} repeat />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        Search YouTube (without the distractions 😊)
      </Typography>
      <Typography color="text.secondary">
        Enter a keyword in the bar above, or paste a video link to open it
        directly.
      </Typography>
    </Box>
  );
}
