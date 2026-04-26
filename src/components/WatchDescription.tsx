"use client";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";

type WatchDescriptionProps = {
  description: string;
};

const COLLAPSED_HEIGHT = 144;

export function WatchDescription({ description }: WatchDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = description.trim();
  const shouldCollapse = trimmed.length > 420 || trimmed.split("\n").length > 6;

  if (!trimmed) return null;

  return (
    <Box
      sx={{
        mt: 2,
        pt: 2,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          position: "relative",
          maxHeight: !expanded && shouldCollapse ? COLLAPSED_HEIGHT : "none",
          overflow: "hidden",
        }}
      >
        <Typography
          variant="body2"
          component="div"
          sx={{
            whiteSpace: "pre-wrap",
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          {trimmed}
        </Typography>
        {!expanded && shouldCollapse ? (
          <Box
            sx={{
              position: "absolute",
              insetInline: 0,
              bottom: 0,
              height: 48,
              background: (theme) =>
                `linear-gradient(to bottom, transparent, ${theme.palette.background.default})`,
            }}
          />
        ) : null}
      </Box>

      {shouldCollapse ? (
        <Button
          size="small"
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setExpanded((value) => !value)}
          sx={{ mt: 1, px: 0 }}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </Box>
  );
}
