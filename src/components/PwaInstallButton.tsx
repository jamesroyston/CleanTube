"use client";

import GetAppOutlinedIcon from "@mui/icons-material/GetAppOutlined";
import IosShareOutlinedIcon from "@mui/icons-material/IosShareOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

export function PwaInstallButton() {
  const { canInstall, installMode, promptInstall } = usePwaInstallPrompt();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  if (!canInstall) return null;

  function handleClick() {
    if (installMode === "ios") {
      setIosDialogOpen(true);
      return;
    }
    void promptInstall();
  }

  return (
    <>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <GetAppOutlinedIcon />
        </ListItemIcon>
        <ListItemText
          primary="Install CleanTube"
          secondary={
            installMode === "ios"
              ? "Add to Home Screen from Safari’s share menu"
              : "Add to your home screen for quick access"
          }
        />
      </ListItemButton>

      <Dialog
        open={iosDialogOpen}
        onClose={() => setIosDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add CleanTube to Home Screen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            iOS does not show an install banner. Use Safari’s share sheet to
            install this app.
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Tap the Share button{" "}
              <IosShareOutlinedIcon
                fontSize="inherit"
                sx={{ verticalAlign: "text-bottom", mx: 0.25 }}
              />{" "}
              in Safari’s toolbar.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Scroll the share sheet and choose <strong>Add to Home Screen</strong>.
            </Typography>
            <Typography component="li" variant="body2">
              Confirm the name, then tap <strong>Add</strong>.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIosDialogOpen(false)}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
