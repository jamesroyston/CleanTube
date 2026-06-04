import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import { getExpectedOrigin, getWebAuthnRpId } from "@/lib/webauthn/config";
import { mapSupabaseUserFacingError, resolveSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Authentication options for conditional UI (browser passkey sheet on sign-in).
 * No allowCredentials — the platform offers discoverable passkeys for this RP.
 */
export async function POST(request: Request) {
  const serviceResult = resolveSupabaseServiceClient();
  if (!serviceResult.ok) {
    return NextResponse.json({ error: serviceResult.error }, { status: 501 });
  }
  const service = serviceResult.client;

  const rpID = getWebAuthnRpId(request);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: row, error: insErr } = await service
    .from("webauthn_challenges")
    .insert({
      challenge: options.challenge,
      kind: "authentication",
      user_id: null,
      login_email: null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return NextResponse.json(
      { error: mapSupabaseUserFacingError(insErr?.message ?? "Could not start sign-in.") },
      { status: 500 },
    );
  }

  return NextResponse.json({
    optionsJSON: options,
    challengeId: row.id,
    expectedOrigin: getExpectedOrigin(request),
  });
}
