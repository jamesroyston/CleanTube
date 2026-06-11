"use client";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";

type ForYouVideoCardMenuProps = {
  videoId: string;
  onDismiss: (videoId: string) => void;
};

export function ForYouVideoCardMenu({
  videoId,
  onDismiss,
}: ForYouVideoCardMenuProps) {
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        type="button"
        size="small"
        aria-label="Recommendation options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setAnchorEl(event.currentTarget);
        }}
        sx={{
          bgcolor: "rgba(0,0,0,0.65)",
          color: "#fff",
          "&:hover": { bgcolor: "rgba(0,0,0,0.82)" },
        }}
      >
        <MoreVertIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        onClick={(event) => event.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDismiss(videoId);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <VisibilityOffOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Not interested</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
