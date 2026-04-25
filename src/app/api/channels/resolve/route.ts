import { NextResponse } from "next/server";

import { getChannelDetails } from "@/lib/youtubeChannel";
import { extractHighConfidenceChannelLookup } from "@/lib/youtubeUrl";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { value?: unknown };
  try {
    body = (await request.json()) as { value?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const value = typeof body.value === "string" ? body.value : "";
  const lookup = extractHighConfidenceChannelLookup(value);
  if (!lookup) {
    return NextResponse.json(
      { error: "Saved channel is not a high-confidence channel id, handle, or URL." },
      { status: 400 },
    );
  }

  const channel = await getChannelDetails(lookup);
  if (!channel) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }

  return NextResponse.json({ channel });
}
