/** Decode a dynamic route segment from Next.js (handles over-encoded paths). */
export function decodeRouteToken(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
