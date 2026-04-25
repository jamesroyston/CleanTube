import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { WebAuthnCredential } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import { byteaToUint8Array } from "@/lib/webauthn/bytea";
import { getExpectedOrigin, getWebAuthnRpId } from "@/lib/webauthn/config";
import { mapSupabaseUserFacingError, resolveSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseRouteHandlerClient } from "@/utils/supabase/route";

type Body = {
  challengeId: string;
  credential: AuthenticationResponseJSON;
  email: string;
};

export async function POST(request: Request) {
  const serviceResult = resolveSupabaseServiceClient();
  if (!serviceResult.ok) {
    return NextResponse.json({ error: serviceResult.error }, { status: 501 });
  }
  const service = serviceResult.client;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!body.challengeId || !body.credential || !email) {
    return NextResponse.json({ error: "Missing challengeId, credential, or email." }, { status: 400 });
  }

  const { data: challengeRow, error: chErr } = await service
    .from("webauthn_challenges")
    .select("challenge, user_id, expires_at, kind, login_email")
    .eq("id", body.challengeId)
    .single();

  if (chErr || !challengeRow || challengeRow.kind !== "authentication") {
    return NextResponse.json({ error: "Unknown or expired sign-in challenge." }, { status: 400 });
  }
  if ((challengeRow.login_email ?? "").toLowerCase() !== email) {
    return NextResponse.json({ error: "Email does not match this sign-in attempt." }, { status: 403 });
  }
  if (new Date(challengeRow.expires_at).getTime() < Date.now()) {
    await service.from("webauthn_challenges").delete().eq("id", body.challengeId);
    return NextResponse.json({ error: "Challenge expired." }, { status: 400 });
  }

  const credentialId = body.credential.id;
  const { data: row, error: rowErr } = await service
    .from("webauthn_credentials")
    .select("id, user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", credentialId)
    .eq("user_id", challengeRow.user_id)
    .maybeSingle();

  if (rowErr || !row) {
    return NextResponse.json({ error: "Credential not found for this account." }, { status: 400 });
  }

  const pkBytes = byteaToUint8Array(row.public_key);
  const credential: WebAuthnCredential = {
    id: row.credential_id,
    publicKey: new Uint8Array(pkBytes),
    counter: Number(row.counter),
    transports: (row.transports ?? []) as WebAuthnCredential["transports"],
  };

  const expectedOrigin = getExpectedOrigin(request);
  const rpID = getWebAuthnRpId(request);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential,
      requireUserVerification: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed.";
    return NextResponse.json(
      {
        error: /user not verified/i.test(message)
          ? "Your device did not verify you with a passcode, PIN, fingerprint, or face unlock. Remove this passkey, register it again, and approve the verification prompt."
          : /well-formed|length not supported|invalid key/i.test(message)
            ? "This passkey record has an invalid stored public key. Sign in with your password, remove this passkey, then register it again."
          : message,
      },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey sign-in could not be verified." }, { status: 400 });
  }

  const newCounter = verification.authenticationInfo.newCounter;
  await service
    .from("webauthn_credentials")
    .update({ counter: newCounter })
    .eq("id", row.id);

  await service.from("webauthn_challenges").delete().eq("id", body.challengeId);

  const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: mapSupabaseUserFacingError(linkErr?.message ?? "Could not create session.") },
      { status: 500 },
    );
  }

  const sessionClient = await createSupabaseRouteHandlerClient();
  if (!sessionClient) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });
  }

  const { error: verifyErr } = await sessionClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyErr) {
    return NextResponse.json({ error: mapSupabaseUserFacingError(verifyErr.message) }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
