"use client";

import GetAppOutlinedIcon from "@mui/icons-material/GetAppOutlined";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

export function PwaInstallButton() {
  const { canInstall, promptInstall } = usePwaInstallPrompt();

  if (!canInstall) return null;

  return (
    <ListItemButton
      onClick={() => {
        void promptInstall();
      }}
    >
      <ListItemIcon>
        <GetAppOutlinedIcon />
      </ListItemIcon>
      <ListItemText
        primary="Install CleanTube"
        secondary="Add to your home screen for quick access"
      />
    </ListItemButton>
  );
}
