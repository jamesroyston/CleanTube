import { NextResponse } from "next/server";

import { buildForYouFeed } from "@/lib/forYou/buildFeed";
import { loadForYouLibrarySignals } from "@/lib/forYou/loadLibrarySignals";

export const runtime = "nodejs";
/** Allow time for bounded InnerTube fetches when refreshing the feed. */
export const maxDuration = 60;

export async function GET() {
  const signals = await loadForYouLibrarySignals();
  if (!signals) {
    return NextResponse.json(
      { error: "Sign in required to load your feed.", sections: [], empty: true },
      { status: 401 },
    );
  }

  try {
    const feed = await buildForYouFeed(signals);
    return NextResponse.json(feed);
  } catch (err) {
    console.error("[api/for-you]", err);
    const message =
      err instanceof Error ? err.message : "Failed to load For You feed.";
    return NextResponse.json(
      { error: message, sections: [], empty: true },
      { status: 500 },
    );
  }
}
