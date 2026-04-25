import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import { getExpectedOrigin, getWebAuthnRpId } from "@/lib/webauthn/config";
import { mapSupabaseUserFacingError, resolveSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseRouteHandlerClient } from "@/utils/supabase/route";

type Body = {
  challengeId: string;
  credential: RegistrationResponseJSON;
  deviceName?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.challengeId || !body.credential) {
    return NextResponse.json({ error: "Missing challengeId or credential." }, { status: 400 });
  }

  const serviceResult = resolveSupabaseServiceClient();
  if (!serviceResult.ok) {
    return NextResponse.json({ error: serviceResult.error }, { status: 501 });
  }
  const service = serviceResult.client;

  const { data: challengeRow, error: chErr } = await service
    .from("webauthn_challenges")
    .select("challenge, user_id, expires_at, kind")
    .eq("id", body.challengeId)
    .single();

  if (chErr || !challengeRow || challengeRow.kind !== "registration") {
    return NextResponse.json({ error: "Unknown or expired registration challenge." }, { status: 400 });
  }
  if (challengeRow.user_id !== user.id) {
    return NextResponse.json({ error: "Challenge does not match the signed-in user." }, { status: 403 });
  }
  if (new Date(challengeRow.expires_at).getTime() < Date.now()) {
    await service.from("webauthn_challenges").delete().eq("id", body.challengeId);
    return NextResponse.json({ error: "Challenge expired." }, { status: 400 });
  }

  const expectedOrigin = getExpectedOrigin(request);
  const rpID = getWebAuthnRpId(request);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey could not be verified." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const deviceName =
    (body.deviceName ?? "").trim() || "Passkey";

  const { error: insErr } = await service.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    device_name: deviceName,
  });

  if (insErr) {
    return NextResponse.json({ error: mapSupabaseUserFacingError(insErr.message) }, { status: 500 });
  }

  await service.from("webauthn_challenges").delete().eq("id", body.challengeId);

  return NextResponse.json({ ok: true });
}
