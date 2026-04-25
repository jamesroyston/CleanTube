import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { SupabaseClient } from "@supabase/supabase-js";

export function browserSupportsPasskeys(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return typeof PublicKeyCredential !== "undefined";
}

export type PasskeyRow = {
  id: string;
  device_name: string | null;
  created_at: string;
};

export type PasskeyRegistrationStep = "preparing" | "prompt" | "saving";

export async function registerPasskeyWithApi(
  deviceName: string,
  onStep?: (step: PasskeyRegistrationStep) => void,
): Promise<{ error: string | null }> {
  const name = deviceName.trim() || "This device";
  onStep?.("preparing");
  const optRes = await fetch("/api/webauthn/register/options", { method: "POST" });
  const optJson = (await optRes.json()) as {
    error?: string;
    optionsJSON?: Parameters<typeof startRegistration>[0]["optionsJSON"];
    challengeId?: string;
  };
  if (!optRes.ok || !optJson.optionsJSON || !optJson.challengeId) {
    return { error: optJson.error ?? "Could not start passkey registration." };
  }

  let credential: Awaited<ReturnType<typeof startRegistration>>;
  try {
    onStep?.("prompt");
    credential = await startRegistration({ optionsJSON: optJson.optionsJSON });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Passkey registration was cancelled or failed." };
  }

  onStep?.("saving");
  const verifyRes = await fetch("/api/webauthn/register/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId: optJson.challengeId,
      credential,
      deviceName: name,
    }),
  });
  const verifyJson = (await verifyRes.json()) as { error?: string };
  if (!verifyRes.ok) {
    return { error: verifyJson.error ?? "Could not save passkey." };
  }
  return { error: null };
}

export async function signInWithPasskeyApi(email: string): Promise<{ error: string | null }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Enter your email to use a passkey." };

  const optRes = await fetch("/api/webauthn/login/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: trimmed }),
  });
  const optJson = (await optRes.json()) as {
    error?: string;
    optionsJSON?: Parameters<typeof startAuthentication>[0]["optionsJSON"];
    challengeId?: string;
  };
  if (!optRes.ok || !optJson.optionsJSON || !optJson.challengeId) {
    return { error: optJson.error ?? "Could not start passkey sign-in." };
  }

  let credential: Awaited<ReturnType<typeof startAuthentication>>;
  try {
    credential = await startAuthentication({ optionsJSON: optJson.optionsJSON });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Passkey sign-in was cancelled or failed." };
  }

  const verifyRes = await fetch("/api/webauthn/login/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      challengeId: optJson.challengeId,
      credential,
      email: trimmed,
    }),
  });
  const verifyJson = (await verifyRes.json()) as { error?: string };
  if (!verifyRes.ok) {
    return { error: verifyJson.error ?? "Passkey sign-in failed." };
  }
  return { error: null };
}

export async function listPasskeysFromDb(supabase: SupabaseClient): Promise<{
  factors: PasskeyRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("webauthn_credentials")
    .select("id, device_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { factors: [], error: error.message };
  }
  return {
    factors: (data ?? []) as PasskeyRow[],
    error: null,
  };
}

export async function deletePasskeyFromDb(
  supabase: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("webauthn_credentials").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
