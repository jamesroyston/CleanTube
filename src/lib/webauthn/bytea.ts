/**
 * Normalize Postgres bytea / Supabase payload to Uint8Array for @simplewebauthn/server.
 */
export function byteaToUint8Array(data: unknown): Uint8Array {
  if (data == null) return new Uint8Array();
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }
  if (typeof data === "string") {
    if (data.startsWith("\\x")) {
      return Uint8Array.from(Buffer.from(data.slice(2), "hex"));
    }
    return Uint8Array.from(Buffer.from(data, "base64"));
  }
  return new Uint8Array();
}
