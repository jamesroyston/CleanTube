"use client";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlaylistRemoveOutlinedIcon from "@mui/icons-material/PlaylistRemoveOutlined";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";

type ForYouSearchSectionMenuProps = {
  query: string;
  onRemove: (query: string) => void;
};

export function ForYouSearchSectionMenu({
  query,
  onRemove,
}: ForYouSearchSectionMenuProps) {
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        type="button"
        size="small"
        aria-label={`Remove “${query}” from For You`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setAnchorEl(event.currentTarget);
        }}
        sx={{
          flexShrink: 0,
          width: 44,
          height: 44,
        }}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            onRemove(query);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <PlaylistRemoveOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove from For You</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
