"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import {
  CleanTubeLogoMark,
  LOGO_VARIANT_LABELS,
  type CleanTubeLogoVariant,
} from "@/components/logo/CleanTubeLogoMark";

const VARIANTS: CleanTubeLogoVariant[] = [
  "wave",
  "dawn",
  "leaf",
  "ripple",
  "horizon",
];

export function LogoConceptsPreview() {
  const theme = useTheme();

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        Logo concepts
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        The header still uses Wave. New concepts lean nature, calm, and abstract —
        say which you prefer if you want to switch.
      </Typography>
      <Stack spacing={1.5}>
        {VARIANTS.map((variant) => {
          const meta = LOGO_VARIANT_LABELS[variant];
          return (
            <Box
              key={variant}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                borderRadius: 2,
                border: 1,
                borderColor: variant === "wave" ? "primary.main" : "divider",
                bgcolor: variant === "wave" ? "action.selected" : "transparent",
              }}
            >
              <Box sx={{ color: "primary.main", flexShrink: 0 }}>
                <CleanTubeLogoMark size={40} variant={variant} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {meta.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {meta.blurb}
                </Typography>
              </Box>
              <Box
                sx={{
                  ml: "auto",
                  display: { xs: "none", sm: "flex" },
                  gap: 1,
                  color: "primary.main",
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <CleanTubeLogoMark size={24} variant={variant} />
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.default,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <CleanTubeLogoMark size={24} variant={variant} />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
