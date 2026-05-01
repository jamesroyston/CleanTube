import type { ChannelDetails } from "@/lib/youtubeTypes";

export type ChannelResolveBatchRow = {
  lookup: string;
  channel: ChannelDetails | null;
  error?: string;
};

export async function fetchChannelResolveBatch(
  values: string[],
): Promise<ChannelResolveBatchRow[]> {
  const res = await fetch("/api/channels/resolve-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: ChannelResolveBatchRow[] };
  return data.results ?? [];
}
