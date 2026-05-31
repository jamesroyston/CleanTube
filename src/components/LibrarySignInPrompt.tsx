"use client";

import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { buildAuthPageHref } from "@/lib/authReturnNavigation";

type LibrarySignInPromptProps = {
  title?: string;
  message?: string;
  compact?: boolean;
};

export function LibrarySignInPrompt({
  title = "Sign in to save your library",
  message = "Watch history, Watch Later, saved channels, and pinned searches are saved to your account when you sign in.",
  compact = false,
}: LibrarySignInPromptProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authHref = useMemo(() => {
    const search = searchParams.toString();
    return buildAuthPageHref(pathname, search ? `?${search}` : undefined);
  }, [pathname, searchParams]);

  if (compact) {
    return (
      <Button
        component={Link}
        href={authHref}
        size="small"
        variant="outlined"
        startIcon={<LoginOutlinedIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        {title}
      </Button>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      <Box>
        <Button
          component={Link}
          href={authHref}
          variant="contained"
          startIcon={<LoginOutlinedIcon />}
        >
          Sign in or create account
        </Button>
      </Box>
    </Stack>
  );
}
