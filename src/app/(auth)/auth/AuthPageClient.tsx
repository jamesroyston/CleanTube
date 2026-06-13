"use client";

import FingerprintIcon from "@mui/icons-material/Fingerprint";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { ListedFactor } from "@/lib/cloudLibrary/mfaClient";
import { browserSupportsPasskeyAutofill } from "@/lib/cloudLibrary/webauthnClient";
import { completeAuthRedirect } from "@/lib/authReturnNavigation";
import { useCloudLibrary } from "@/context/CloudLibraryContext";

type Mode = "sign-in" | "sign-up" | "reset";

type MfaPanel =
  | { kind: "none" }
  | { kind: "pick" }
  | { kind: "totp"; factorId: string }
  | { kind: "phone"; factorId: string; challengeId: string | null; smsSent: boolean };

export function AuthPageClient() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const nextParam = searchParams.get("next");

  function redirectAfterSignIn() {
    completeAuthRedirect(nextParam);
  }

  const {
    isCloudConfigured,
    signIn,
    signUp,
    resetPassword,
    user,
    passkeysSupported,
    registerPasskey,
    signInWithPasskey,
    signInWithPasskeyConditional,
    deletePasskey,
    listPasskeys,
    getPendingSupabaseMfa,
    completeTotpMfa,
    sendPhoneMfaChallenge,
    completePhoneMfa,
    signOutUser,
  } = useCloudLibrary();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeyFriendlyName, setPasskeyFriendlyName] = useState("This device");
  const [registeredPasskeys, setRegisteredPasskeys] = useState<
    { id: string; device_name: string | null; created_at: string }[]
  >([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const [mfaPanel, setMfaPanel] = useState<MfaPanel>({ kind: "none" });
  const [mfaFactors, setMfaFactors] = useState<ListedFactor[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void listPasskeys().then((res) => {
      if (!cancelled && !res.error) setRegisteredPasskeys(res.factors);
    });
    return () => {
      cancelled = true;
    };
  }, [user, listPasskeys]);

  const helperCopy = useMemo(() => {
    if (mode === "sign-up") {
      return "Create an account to sync your library across devices.";
    }
    if (mode === "reset") {
      return "We'll email you a password reset link.";
    }
    return "Sign in to sync your library across devices.";
  }, [mode]);

  const finishSignIn = useCallback(async () => {
    const mfa = await getPendingSupabaseMfa();
    if (mfa.error) {
      setError(mfa.error);
      return;
    }
    if (!mfa.needsMfa) {
      redirectAfterSignIn();
      return;
    }

    const totp = mfa.factors.find((f) => f.factor_type === "totp");
    const phone = mfa.factors.find((f) => f.factor_type === "phone");
    setMfaFactors(mfa.factors);

    if (totp && phone) {
      setMfaPanel({ kind: "pick" });
      return;
    }
    if (totp) {
      setMfaPanel({ kind: "totp", factorId: totp.id });
      return;
    }
    if (phone) {
      setMfaPanel({ kind: "phone", factorId: phone.id, challengeId: null, smsSent: false });
      return;
    }

    setError(
      "Your account requires a second sign-in step, but no authenticator app or SMS factor is enrolled. Add MFA in the Supabase dashboard or contact support.",
    );
  }, [getPendingSupabaseMfa, nextParam]);

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
        setMessage(
          "Account created. Check your email to confirm if required, then sign in.",
        );
      }
    } else if (mode === "reset") {
      result = await resetPassword(trimmedEmail);
      if (!result.error) {
        setMessage("Password reset email sent.");
      }
    } else {
      result = await signIn(trimmedEmail, password);
      if (!result.error) {
        await finishSignIn();
      }
    }

    if (result.error) setError(result.error);
    setSubmitting(false);
  }

  async function onTotpSubmit() {
    if (mfaPanel.kind !== "totp") return;
    setSubmitting(true);
    setError(null);
    const res = await completeTotpMfa(mfaPanel.factorId, totpCode);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMfaPanel({ kind: "none" });
    redirectAfterSignIn();
  }

  async function onSendPhoneSms() {
    if (mfaPanel.kind !== "phone") return;
    setSubmitting(true);
    setError(null);
    const res = await sendPhoneMfaChallenge(mfaPanel.factorId);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMfaPanel({
      kind: "phone",
      factorId: mfaPanel.factorId,
      challengeId: res.challengeId,
      smsSent: true,
    });
  }

  async function onPhoneSubmit() {
    if (mfaPanel.kind !== "phone" || !mfaPanel.challengeId) return;
    setSubmitting(true);
    setError(null);
    const res = await completePhoneMfa(mfaPanel.factorId, mfaPanel.challengeId, phoneCode);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMfaPanel({ kind: "none" });
    redirectAfterSignIn();
  }

  async function onPasskeySignIn() {
    setPasskeyBusy(true);
    setError(null);
    const res = await signInWithPasskey(email);
    setPasskeyBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.dismissed) return;
    await finishSignIn();
  }

  const showCredentialForm = mode === "sign-in" && mfaPanel.kind === "none";

  /** eBay-style conditional passkey sheet when the sign-in form is shown. */
  useEffect(() => {
    if (
      !isCloudConfigured ||
      !passkeysSupported ||
      !showCredentialForm ||
      user
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const autofillSupported = await browserSupportsPasskeyAutofill();
      if (!autofillSupported || cancelled) return;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled || !document.getElementById("cleantube-signin-email")) return;

      // Conditional autofill stays pending until the user picks a passkey, so it must
      // NOT set passkeyBusy — that would keep the manual "Sign in with passkey" button
      // disabled the whole time the page is open. It runs silently in the background.
      const res = await signInWithPasskeyConditional();
      if (cancelled) return;
      if (res.error) {
        // Aborted autofill (e.g. the user used the manual button or password) is not an
        // error worth surfacing; only show genuine failures.
        if (!res.dismissed) setError(res.error);
        return;
      }
      if (res.dismissed) return;
      await finishSignIn();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    finishSignIn,
    isCloudConfigured,
    passkeysSupported,
    showCredentialForm,
    signInWithPasskeyConditional,
    user,
  ]);

  async function onRegisterPasskey() {
    setPasskeyBusy(true);
    setMessage(null);
    setError(null);

    const res = await registerPasskey(passkeyFriendlyName);
    setPasskeyBusy(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setMessage("Passkey registered.");
    void listPasskeys().then((r) => {
      if (!r.error) setRegisteredPasskeys(r.factors);
    });
  }

  return (
    <Box component="main" sx={{ width: "100%", maxWidth: 560, pb: 2 }}>
      <Container maxWidth="sm" disableGutters sx={{ px: 0 }}>
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
          <Stack spacing={2}>
            <Alert severity="success">
              Signed in as {user.email ?? "your account"}. Your library syncs to your account.
            </Alert>
            {message ? <Alert severity="success">{message}</Alert> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            {passkeysSupported ? (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FingerprintIcon color="action" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Passkeys
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Sign in on this device without a password.
                  </Typography>
                  <TextField
                    size="small"
                    label="Passkey label"
                    value={passkeyFriendlyName}
                    onChange={(e) => setPasskeyFriendlyName(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FingerprintIcon />}
                    disabled={passkeyBusy}
                    onClick={() => void onRegisterPasskey()}
                  >
                    {passkeyBusy ? "Adding passkey..." : "Add passkey"}
                  </Button>
                  {registeredPasskeys.length > 0 ? (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        Your passkeys
                      </Typography>
                      <List dense disablePadding>
                        {registeredPasskeys.map((f) => (
                          <ListItem
                            key={f.id}
                            disableGutters
                            secondaryAction={
                              <Button
                                size="small"
                                color="error"
                                onClick={() => {
                                  void deletePasskey(f.id).then((res) => {
                                    if (res.error) setError(res.error);
                                    else
                                      void listPasskeys().then((r) => {
                                        if (!r.error) setRegisteredPasskeys(r.factors);
                                      });
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            }
                          >
                            <ListItemText
                              primary={f.device_name ?? "Passkey"}
                              secondary={new Date(f.created_at).toLocaleString()}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  ) : null}
                </Stack>
              </Box>
            ) : (
              <Alert severity="info">
                Passkeys need HTTPS (or localhost) and a browser with Web Authentication support.
              </Alert>
            )}
          </Stack>
        ) : (
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <Tabs
              value={mode}
              onChange={(_event, next) => {
                setMode(next);
                setMessage(null);
                setError(null);
                setMfaPanel({ kind: "none" });
                setMfaFactors([]);
              }}
              variant="fullWidth"
            >
              <Tab value="sign-in" label="Sign in" />
              <Tab value="sign-up" label="Create account" />
              <Tab value="reset" label="Reset password" />
            </Tabs>
            <Box sx={{ p: 3 }}>
              <Stack spacing={2}>
                {urlError ? <Alert severity="error">{urlError}</Alert> : null}
                {message ? <Alert severity="success">{message}</Alert> : null}
                {error ? <Alert severity="error">{error}</Alert> : null}

                {mfaPanel.kind === "pick" ? (
                  <Stack spacing={2}>
                    <Alert severity="warning">
                      Complete two-factor authentication to finish signing in.
                    </Alert>
                    <Button
                      variant="contained"
                      startIcon={<VpnKeyOutlinedIcon />}
                      onClick={() => {
                        const f = mfaFactors.find((x) => x.factor_type === "totp");
                        if (f) setMfaPanel({ kind: "totp", factorId: f.id });
                      }}
                    >
                      Use authenticator app
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<SmsOutlinedIcon />}
                      onClick={() => {
                        const f = mfaFactors.find((x) => x.factor_type === "phone");
                        if (f)
                          setMfaPanel({
                            kind: "phone",
                            factorId: f.id,
                            challengeId: null,
                            smsSent: false,
                          });
                      }}
                    >
                      Use SMS code
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        void signOutUser();
                        setMfaPanel({ kind: "none" });
                        setMfaFactors([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                ) : null}

                {mfaPanel.kind === "totp" ? (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Authenticator app</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enter the 6-digit code from your authenticator app.
                    </Typography>
                    <TextField
                      label="6-digit code"
                      name="totp"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      slotProps={{
                        htmlInput: {
                          inputMode: "numeric",
                          autoComplete: "one-time-code",
                        },
                      }}
                    />
                    <Button variant="contained" disabled={submitting} onClick={() => void onTotpSubmit()}>
                      Verify and continue
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        void signOutUser();
                        setMfaPanel({ kind: "none" });
                        setMfaFactors([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                ) : null}

                {mfaPanel.kind === "phone" ? (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">SMS verification</Typography>
                    {!mfaPanel.smsSent ? (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          We will send a code to the phone number on your account.
                        </Typography>
                        <Button
                          variant="contained"
                          disabled={submitting}
                          onClick={() => void onSendPhoneSms()}
                        >
                          Send SMS code
                        </Button>
                      </>
                    ) : (
                      <>
                        <TextField
                          label="SMS code"
                          name="sms"
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          slotProps={{
                            htmlInput: {
                              inputMode: "numeric",
                              autoComplete: "one-time-code",
                            },
                          }}
                        />
                        <Button
                          variant="contained"
                          disabled={submitting || !mfaPanel.challengeId}
                          onClick={() => void onPhoneSubmit()}
                        >
                          Verify and continue
                        </Button>
                      </>
                    )}
                    <Button
                      size="small"
                      onClick={() => {
                        void signOutUser();
                        setMfaPanel({ kind: "none" });
                        setMfaFactors([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                ) : null}

                {showCredentialForm ? (
                  <>
                    <Box
                      component="form"
                      id="cleantube-signin"
                      onSubmit={onSubmit}
                      method="post"
                      autoComplete="on"
                    >
                      <Stack spacing={2}>
                        <TextField
                          type="email"
                          name="username"
                          id="cleantube-signin-email"
                          label="Email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          slotProps={{
                            htmlInput: {
                              autoComplete: passkeysSupported
                                ? "username webauthn"
                                : "username",
                              inputMode: "email",
                              autoCapitalize: "none",
                            },
                          }}
                        />
                        <TextField
                          type="password"
                          name="password"
                          id="cleantube-signin-password"
                          label="Password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          slotProps={{
                            htmlInput: { autoComplete: "current-password" },
                          }}
                        />
                        <Button type="submit" variant="contained" disabled={submitting}>
                          Sign in
                        </Button>
                      </Stack>
                    </Box>
                    {passkeysSupported ? (
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                          or
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<FingerprintIcon />}
                          disabled={passkeyBusy}
                          onClick={() => void onPasskeySignIn()}
                        >
                          Sign in with passkey
                        </Button>
                      </Stack>
                    ) : null}
                  </>
                ) : mode !== "sign-in" ? (
                  <Box
                    component="form"
                    id={mode === "sign-up" ? "cleantube-signup" : "cleantube-reset"}
                    onSubmit={onSubmit}
                    method="post"
                    autoComplete="on"
                  >
                    <Stack spacing={2}>
                      <TextField
                        type="email"
                        name="email"
                        id={
                          mode === "sign-up"
                            ? "cleantube-signup-email"
                            : "cleantube-reset-email"
                        }
                        label="Email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        slotProps={{
                          htmlInput: {
                            autoComplete: "email",
                            inputMode: "email",
                            autoCapitalize: "none",
                          },
                        }}
                      />
                      {mode !== "reset" ? (
                        <TextField
                          type="password"
                          name="new-password"
                          id="cleantube-signup-password"
                          label="Password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          slotProps={{
                            htmlInput: { autoComplete: "new-password" },
                          }}
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
                ) : null}
              </Stack>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
