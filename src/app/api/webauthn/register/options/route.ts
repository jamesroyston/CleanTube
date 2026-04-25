import {
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { NextResponse } from "next/server";

import { getWebAuthnRpId, getWebAuthnRpName } from "@/lib/webauthn/config";
import { mapSupabaseUserFacingError, resolveSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseRouteHandlerClient } from "@/utils/supabase/route";

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json(
      { error: mapSupabaseUserFacingError(userError.message) },
      { status: 401 },
    );
  }
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const serviceResult = resolveSupabaseServiceClient();
  if (!serviceResult.ok) {
    return NextResponse.json({ error: serviceResult.error }, { status: 501 });
  }
  const service = serviceResult.client;

  const { data: existing } = await service
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const excludeCredentials =
    existing?.map((row) => ({
      id: row.credential_id,
      transports: row.transports ?? [],
    })) ?? [];

  const rpID = getWebAuthnRpId(request);
  const options = await generateRegistrationOptions({
    rpName: getWebAuthnRpName(),
    rpID,
    userName: user.email,
    userID: isoUint8Array.fromUTF8String(user.id),
    userDisplayName: user.email,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: row, error: insErr } = await service
    .from("webauthn_challenges")
    .insert({
      challenge: options.challenge,
      kind: "registration",
      user_id: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return NextResponse.json(
      { error: mapSupabaseUserFacingError(insErr?.message ?? "Could not start registration.") },
      { status: 500 },
    );
  }

  return NextResponse.json({
    optionsJSON: options,
    challengeId: row.id,
  });
}
