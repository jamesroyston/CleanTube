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
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { ListedFactor } from "@/lib/cloudLibrary/mfaClient";
import { useCloudLibrary } from "@/context/CloudLibraryContext";

type Mode = "sign-in" | "sign-up" | "reset";

type MfaPanel =
  | { kind: "none" }
  | { kind: "pick" }
  | { kind: "totp"; factorId: string }
  | { kind: "phone"; factorId: string; challengeId: string | null; smsSent: boolean };

type PasskeyRegistrationStatus = "preparing" | "prompt" | "saving" | null;

export function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const {
    isCloudConfigured,
    signIn,
    signUp,
    resetPassword,
    user,
    passkeysSupported,
    registerPasskey,
    signInWithPasskey,
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
  const [passkeyRegistrationStatus, setPasskeyRegistrationStatus] =
    useState<PasskeyRegistrationStatus>(null);

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
      return "Create an account to sync watch later, saved channels, and progress. Passkeys are added after you can sign in—see the note on this tab.";
    }
    if (mode === "reset") {
      return "Send a password reset email for your Supabase account.";
    }
    return "Sign in to merge your local library into the cloud.";
  }, [mode]);

  const passkeyRegistrationCopy = useMemo(() => {
    if (passkeyRegistrationStatus === "preparing") {
      return "Preparing passkey setup with the server...";
    }
    if (passkeyRegistrationStatus === "prompt") {
      return "Check your browser, device, or password manager for the passkey prompt. It may appear outside this page.";
    }
    if (passkeyRegistrationStatus === "saving") {
      return "Passkey created. Saving it to your account...";
    }
    return null;
  }, [passkeyRegistrationStatus]);

  async function finishSignIn() {
    const mfa = await getPendingSupabaseMfa();
    if (mfa.error) {
      setError(mfa.error);
      return;
    }
    if (!mfa.needsMfa) {
      setMessage("Signed in. You can register a passkey below, then use it from the Sign in tab next time.");
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
  }

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
          "Account created. If your project sends a confirmation email, open it to verify, then sign in on the Sign in tab. After you are signed in, stay on this Account page and use Register passkey to add a passkey.",
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
    setMessage("Signed in. You can register a passkey below, then use it from the Sign in tab next time.");
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
    setMessage("Signed in. You can register a passkey below, then use it from the Sign in tab next time.");
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
    router.push("/");
  }

  async function onRegisterPasskey() {
    setPasskeyBusy(true);
    setPasskeyRegistrationStatus("preparing");
    setMessage(null);
    setError(null);

    const res = await registerPasskey(passkeyFriendlyName, setPasskeyRegistrationStatus);
    setPasskeyBusy(false);
    setPasskeyRegistrationStatus(null);

    if (res.error) {
      setError(res.error);
      return;
    }

    setMessage("Passkey registered. Next time, enter your email on the Sign in tab and choose Sign in with passkey.");
    void listPasskeys().then((r) => {
      if (!r.error) setRegisteredPasskeys(r.factors);
    });
  }

  const showCredentialForm = mode === "sign-in" && mfaPanel.kind === "none";

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
              Signed in as {user.email ?? "your account"}. Local library data will sync automatically.
              {passkeysSupported ? " Register a passkey below to use this device for future sign-ins." : null}
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
                    Click register, then approve the browser or OS passkey prompt. After it is saved,
                    future sign-ins use your email plus this device passkey instead of your password.
                  </Typography>
                  {passkeyRegistrationCopy ? (
                    <Alert severity="info" icon={<FingerprintIcon />}>
                      {passkeyRegistrationCopy}
                    </Alert>
                  ) : null}
                  <TextField
                    size="small"
                    label="Passkey label"
                    value={passkeyFriendlyName}
                    onChange={(e) => setPasskeyFriendlyName(e.target.value)}
                    helperText="Use a different label for each device."
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FingerprintIcon />}
                    disabled={passkeyBusy}
                    onClick={() => void onRegisterPasskey()}
                  >
                    {passkeyBusy ? "Registering passkey..." : "Register passkey on this device"}
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

                {mode === "sign-up" ? (
                  <Alert severity="info" icon={<FingerprintIcon />}>
                    <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, mb: 0.5 }}>
                      Passkeys and sign-up
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ display: "block" }}>
                      A passkey is tied to your account, so it cannot be created before you have signed up and
                      signed in at least once. After you create your account (and confirm your email if your
                      project requires it), go to the <strong>Sign in</strong> tab, sign in, then use{" "}
                      <strong>Register passkey on this device</strong> on this same page—or open Account from
                      the header anytime.
                    </Typography>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      sx={{ mt: 1, cursor: "pointer" }}
                      onClick={() => {
                        setMode("sign-in");
                        setMessage(null);
                        setError(null);
                      }}
                    >
                      Already have an account? Sign in to add a passkey
                    </Link>
                  </Alert>
                ) : null}

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
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      inputProps={{ inputMode: "numeric", autoComplete: "one-time-code" }}
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
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          inputProps={{ inputMode: "numeric", autoComplete: "one-time-code" }}
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
                    <Box component="form" onSubmit={onSubmit}>
                      <Stack spacing={2}>
                        <TextField
                          type="email"
                          label="Email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                        />
                        <TextField
                          type="password"
                          label="Password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
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
                          disabled={passkeyBusy || !email.trim()}
                          onClick={() => void onPasskeySignIn()}
                        >
                          Sign in with passkey
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          Uses a passkey you registered while signed in. Enter your email above first.
                        </Typography>
                      </Stack>
                    ) : null}
                  </>
                ) : mode !== "sign-in" ? (
                  <Box component="form" onSubmit={onSubmit}>
                    <Stack spacing={2}>
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
                ) : null}
              </Stack>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
