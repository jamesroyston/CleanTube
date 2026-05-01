"use client";

import Button from "@mui/material/Button";
import Link from "next/link";

/** Client-only: MUI `Button` + `component={Link}` cannot be built in a Server Component. */
export function GoToChannelButton({ href }: { href: string }) {
  return (
    <Button
      component={Link}
      href={href}
      size="small"
      variant="outlined"
      sx={{ alignSelf: "flex-start" }}
    >
      Go to channel
    </Button>
  );
}
