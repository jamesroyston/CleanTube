import { NextResponse } from "next/server";

import { CHANNEL_RESOLVE_CACHE_CONTROL, getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
import { extractHighConfidenceChannelLookup } from "@/lib/youtubeUrl";
import type { ChannelDetails } from "@/lib/youtubeTypes";

const MAX_BATCH = 40;

/**
 * Parallel cap for channel resolves in one batch. Limits burst load on the
 * YouTube Data API (quota) and avoids stampedes through cache/revalidation.
 */
const RESOLVE_BATCH_CONCURRENCY = 5;

async function mapWithBoundedConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

type ChannelResolveBatchResult = {
  lookup: string;
  channel: ChannelDetails | null;
  error?: string;
};

export async function POST(request: Request) {
  let body: { values?: unknown };
  try {
    body = (await request.json()) as { values?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body.values;
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "Expected a values array." },
      { status: 400 },
    );
  }

  const lookups: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const lookup = extractHighConfidenceChannelLookup(item);
    if (!lookup || seen.has(lookup)) continue;
    seen.add(lookup);
    lookups.push(lookup);
    if (lookups.length >= MAX_BATCH) break;
  }

  const results = await mapWithBoundedConcurrency(
    lookups,
    RESOLVE_BATCH_CONCURRENCY,
    async (lookup) => {
      try {
        const channel = await getChannelDetailsCached(lookup);
        return {
          lookup,
          channel,
          ...(channel ? {} : { error: "not_found" }),
        } satisfies ChannelResolveBatchResult;
      } catch {
        return {
          lookup,
          channel: null,
          error: "resolve_failed",
        } satisfies ChannelResolveBatchResult;
      }
    },
  );

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": CHANNEL_RESOLVE_CACHE_CONTROL,
      },
    },
  );
}
