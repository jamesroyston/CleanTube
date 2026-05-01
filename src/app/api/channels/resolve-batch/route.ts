import { NextResponse } from "next/server";

import { CHANNEL_RESOLVE_CACHE_CONTROL, getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";
import { extractHighConfidenceChannelLookup } from "@/lib/youtubeUrl";
import type { ChannelDetails } from "@/lib/youtubeTypes";

export const runtime = "nodejs";

const MAX_BATCH = 40;

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

  const results: ChannelResolveBatchResult[] = [];
  for (const lookup of lookups) {
    try {
      const channel = await getChannelDetailsCached(lookup);
      results.push({
        lookup,
        channel,
        ...(channel ? {} : { error: "not_found" }),
      });
    } catch {
      results.push({
        lookup,
        channel: null,
        error: "resolve_failed",
      });
    }
  }

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": CHANNEL_RESOLVE_CACHE_CONTROL,
      },
    },
  );
}
