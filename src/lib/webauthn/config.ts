/**
 * WebAuthn relying party: hostname in production should match the site URL (see WEBAUTHN_RP_ID).
 */
export function getWebAuthnRpId(request: Request): string {
  const fromEnv = process.env.WEBAUTHN_RP_ID?.trim();
  if (fromEnv) return fromEnv;
  const host = new URL(request.url).hostname;
  return host;
}

export function getWebAuthnRpName(): string {
  return process.env.WEBAUTHN_RP_NAME?.trim() || "CleanTube";
}

export function getExpectedOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return new URL(request.url).origin;
}
