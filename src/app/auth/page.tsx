"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { useCloudLibrary } from "@/context/CloudLibraryContext";

type Mode = "sign-in" | "sign-up" | "reset";

export default function AuthPage() {
  const router = useRouter();
  const { isCloudConfigured, signIn, signUp, resetPassword, user } =
    useCloudLibrary();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const helperCopy = useMemo(() => {
    if (mode === "sign-up") {
      return "Create an account to sync watch later, saved channels, and progress.";
    }
    if (mode === "reset") {
      return "Send a password reset email for your Supabase account.";
    }
    return "Sign in to merge your local library into the cloud.";
  }, [mode]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const trimmedEmail = email.trim();
    let result: { error: string | null };

    if (mode === "sign-up") {
      result = await signUp(trimmedEmail, password);
      if (!result.error) {
        setMessage("Account created. Check your email if confirmation is required.");
      }
    } else if (mode === "reset") {
      result = await resetPassword(trimmedEmail);
      if (!result.error) {
        setMessage("Password reset email sent.");
      }
    } else {
      result = await signIn(trimmedEmail, password);
      if (!result.error) {
        router.push("/");
      }
    }

    if (result.error) setError(result.error);
    setSubmitting(false);
  }

  return (
    <Box component="main" sx={{ pb: 6, minHeight: "100vh" }}>
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700 }}>
          Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {helperCopy}
        </Typography>
        {!isCloudConfigured ? (
          <Alert severity="info">
            Supabase env vars are not configured in this deployment yet, so auth is unavailable.
          </Alert>
        ) : user ? (
          <Alert severity="success">
            Signed in as {user.email ?? "your account"}. Local library data will sync automatically.
          </Alert>
        ) : (
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <Tabs
              value={mode}
              onChange={(_event, next) => {
                setMode(next);
                setMessage(null);
                setError(null);
              }}
              variant="fullWidth"
            >
              <Tab value="sign-in" label="Sign in" />
              <Tab value="sign-up" label="Create account" />
              <Tab value="reset" label="Reset password" />
            </Tabs>
            <Box component="form" onSubmit={onSubmit} sx={{ p: 3 }}>
              <Stack spacing={2}>
                {message ? <Alert severity="success">{message}</Alert> : null}
                {error ? <Alert severity="error">{error}</Alert> : null}
                <TextField
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                {mode !== "reset" ? (
                  <TextField
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                ) : null}
                <Button type="submit" variant="contained" disabled={submitting}>
                  {mode === "sign-up"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset email"
                      : "Sign in"}
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
