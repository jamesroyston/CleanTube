/**
 * Opt-in server logging for comment hot paths. Default production noise: none.
 */
export function isCleantubeCommentsDebugEnabled(): boolean {
  return process.env.CLEANTUBE_DEBUG_COMMENTS === "1";
}

export function cleantubeCommentsDebugLog(
  scope: string,
  data: Record<string, unknown>,
): void {
  if (!isCleantubeCommentsDebugEnabled()) return;
  console.info(`[cleantube:comments] ${scope}`, data);
}

export function readCleantubeCommentsPositiveIntEnv(
  name: string,
  fallback: number,
  hardMax = 5000,
): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, hardMax);
}
