import { NextResponse, type NextRequest } from "next/server";

import {
  buildForYouFeedCached,
  claimForcedFeedRefresh,
} from "@/lib/forYou/feedCache";
import { loadForYouLibrarySignals } from "@/lib/forYou/loadLibrarySignals";

/** Allow time for bounded InnerTube fetches when refreshing the feed. */
export const maxDuration = 30;

/** `<userId>.<epochMs>` of this device's last forced refresh. */
const REFRESH_EPOCH_COOKIE = "ct_fy_refresh";

function readRefreshEpoch(request: NextRequest, userId: string): number {
  const raw = request.cookies.get(REFRESH_EPOCH_COOKIE)?.value;
  if (!raw) return 0;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || raw.slice(0, dot) !== userId) return 0;
  const epoch = Number(raw.slice(dot + 1));
  return Number.isSafeInteger(epoch) && epoch > 0 ? epoch : 0;
}

export async function GET(request: NextRequest) {
  const signals = await loadForYouLibrarySignals();
  if (!signals) {
    return NextResponse.json(
      { error: "Sign in required to load your feed.", sections: [], empty: true },
      { status: 401 },
    );
  }

  const { userId } = signals;
  const previousEpoch = readRefreshEpoch(request, userId);
  const forceRequested = request.nextUrl.searchParams.get("refresh") === "1";
  const forced =
    forceRequested && claimForcedFeedRefresh(userId, previousEpoch);
  const refreshEpoch = forced ? Date.now() : previousEpoch;

  try {
    const feed = await buildForYouFeedCached(userId, signals, refreshEpoch);
    const response = NextResponse.json(feed);
    if (forceRequested) {
      response.headers.set("Cache-Control", "no-store");
      response.headers.set(
        "X-For-You-Refresh",
        forced ? "rebuilt" : "throttled",
      );
    }
    if (forced) {
      response.cookies.set(REFRESH_EPOCH_COOKIE, `${userId}.${refreshEpoch}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/api/for-you",
        maxAge: 60 * 60 * 24,
      });
    }
    return response;
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
