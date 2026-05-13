/**
 * Structured server logs for channel InnerTube fetches (visible in Vercel / Node).
 * Prefix keeps log drains easy to filter.
 */
const PREFIX = "[cleantube:channel-fetch]";

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function logChannelFetchFailure(
  event: string,
  fields: Record<string, string | number | boolean | undefined | null>,
  err?: unknown,
): void {
  const payload = { ...fields, event };
  if (err !== undefined) {
    Object.assign(payload, { error: errMessage(err) });
  }
  console.error(PREFIX, payload);
}
