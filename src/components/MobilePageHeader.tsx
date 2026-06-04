"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export type MobilePageHeaderProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
};

export function MobilePageHeader({
  title,
  backHref = "/library",
  backLabel = "Back",
}: MobilePageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 2,
        minHeight: 44,
      }}
    >
      <IconButton
        component={Link}
        href={backHref}
        aria-label={backLabel}
        edge="start"
        size="small"
        sx={{ ml: -0.5 }}
      >
        <ArrowBackIcon />
      </IconButton>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
    </Box>
  );
}
