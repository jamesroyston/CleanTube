"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useState } from "react";

/** ~3–4 lines at body2 with line-height 1.6 */
const COLLAPSED_HEIGHT = 88;

type CondensedDescriptionProps = {
  text: string;
  /** Shown in the full-text dialog; defaults to "Description". */
  dialogTitle?: string;
  maxWidth?: number | string;
};

export function CondensedDescription({
  text,
  dialogTitle = "Description",
  maxWidth = 820,
}: CondensedDescriptionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const trimmed = text.trim();
  const shouldCollapse =
    trimmed.length > 200 || trimmed.split("\n").length > 4;

  if (!trimmed) return null;

  return (
    <>
      <Box sx={{ mt: 1, maxWidth, position: "relative" }}>
        <Box
          sx={{
            maxHeight: shouldCollapse ? COLLAPSED_HEIGHT : "none",
            overflow: "hidden",
            ...(shouldCollapse
              ? {
                  WebkitMaskImage:
                    "linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)",
                }
              : {}),
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
          >
            {trimmed}
          </Typography>
        </Box>

        {shouldCollapse ? (
          <Button
            size="small"
            onClick={() => setDialogOpen(true)}
            sx={{ mt: 0.5, px: 0, minWidth: 0 }}
          >
            Show more
          </Button>
        ) : null}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "text.secondary" }}
          >
            {trimmed}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
