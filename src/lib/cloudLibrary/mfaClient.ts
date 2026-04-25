import type { SupabaseClient } from "@supabase/supabase-js";

export type ListedFactor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
};

/**
 * After password sign-in, returns whether the user must complete Supabase MFA (TOTP / phone) to reach AAL2.
 */
export async function getPendingSupabaseMfa(
  supabase: SupabaseClient,
): Promise<{
  needsMfa: boolean;
  factors: ListedFactor[];
  error: string | null;
}> {
  const { data: aal, error: aalErr } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalErr) {
    return { needsMfa: false, factors: [], error: aalErr.message };
  }
  if (!aal) return { needsMfa: false, factors: [], error: null };
  if (aal.currentLevel === "aal2") {
    return { needsMfa: false, factors: [], error: null };
  }
  if (aal.nextLevel !== "aal2") {
    return { needsMfa: false, factors: [], error: null };
  }

  const { data: factorData, error: listErr } = await supabase.auth.mfa.listFactors();
  if (listErr) {
    return { needsMfa: true, factors: [], error: listErr.message };
  }

  const factors =
    factorData?.all
      .filter(
        (f) =>
          f.status === "verified" &&
          (f.factor_type === "totp" || f.factor_type === "phone"),
      )
      .map((f) => ({
        id: f.id,
        factor_type: f.factor_type,
        status: f.status,
        friendly_name: f.friendly_name,
      })) ?? [];

  return { needsMfa: true, factors, error: null };
}

export async function completeTotpMfa(
  supabase: SupabaseClient,
  code: string,
  factorId: string,
): Promise<{ error: string | null }> {
  const trimmed = code.replace(/\s/g, "");
  if (trimmed.length < 6) {
    return { error: "Enter the 6-digit code from your authenticator app." };
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: trimmed,
  });
  return { error: error?.message ?? null };
}

export async function sendPhoneMfaChallenge(
  supabase: SupabaseClient,
  factorId: string,
): Promise<{ challengeId: string | null; error: string | null }> {
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId,
    channel: "sms",
  });
  if (error) return { challengeId: null, error: error.message };
  return { challengeId: data?.id ?? null, error: null };
}

export async function completePhoneMfa(
  supabase: SupabaseClient,
  factorId: string,
  challengeId: string,
  code: string,
): Promise<{ error: string | null }> {
  const trimmed = code.replace(/\s/g, "");
  if (!trimmed) return { error: "Enter the code from your SMS message." };
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code: trimmed,
  });
  return { error: error?.message ?? null };
}
