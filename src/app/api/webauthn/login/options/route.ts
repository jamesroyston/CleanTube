import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";

import { getExpectedOrigin, getWebAuthnRpId } from "@/lib/webauthn/config";
import { mapSupabaseUserFacingError, resolveSupabaseServiceClient } from "@/lib/supabase/service";

type Body = {
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
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { data: userId, error: rpcErr } = await service.rpc("webauthn_user_id_by_email", {
    lookup_email: email,
  });

  if (rpcErr || !userId) {
    return NextResponse.json({ error: "No account found for that email." }, { status: 404 });
  }

  const uid = userId as string;

  const { data: creds, error: cErr } = await service
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", uid);

  if (cErr) {
    return NextResponse.json({ error: mapSupabaseUserFacingError(cErr.message) }, { status: 500 });
  }

  if (!creds?.length) {
    return NextResponse.json(
      { error: "No passkeys registered for this account. Sign in with a password and add one on the Account page." },
      { status: 400 },
    );
  }

  const allowCredentials = creds.map((c) => ({
    id: c.credential_id,
    transports: c.transports ?? [],
  }));

  const rpID = getWebAuthnRpId(request);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
  });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: row, error: insErr } = await service
    .from("webauthn_challenges")
    .insert({
      challenge: options.challenge,
      kind: "authentication",
      user_id: uid,
      login_email: email,
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
