import type { ChannelSearchResult } from "@/lib/youtubeTypes";

/** Strip noise words and normalize for fuzzy channel↔query comparison. */
export function normalizeChannelMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(official|channel|tv|youtube|videos|vevo|music|the)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 1),
  );
}

/**
 * Score in [0, 1] how well a channel search hit matches the user's query.
 * Heuristic only — InnerTube does not expose relevance scores.
 */
export function scoreChannelQueryMatch(
  query: string,
  channel: ChannelSearchResult,
): number {
  const q = normalizeChannelMatchText(query);
  if (!q) return 0;

  const title = normalizeChannelMatchText(channel.title);
  const handle = channel.handle
    ? normalizeChannelMatchText(channel.handle)
    : "";

  if (q === title || (handle && q === handle)) return 1;
  if (title && (title.includes(q) || q.includes(title))) return 0.92;
  if (handle && (handle.includes(q) || q.includes(handle))) return 0.9;

  const qTokens = tokenSet(q);
  if (qTokens.size === 0) return 0;

  const titleTokens = [...tokenSet(title), ...tokenSet(handle)];
  if (titleTokens.length === 0) return 0;

  let overlap = 0;
  for (const t of qTokens) {
    if (titleTokens.includes(t)) overlap += 1;
  }
  const tokenRatio = overlap / qTokens.size;

  const prefixBonus =
    title.startsWith(q) || q.startsWith(title) || (handle && handle.startsWith(q))
      ? 0.15
      : 0;

  return Math.min(1, tokenRatio + prefixBonus);
}

function minAcceptScore(query: string): number {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (trimmed.length <= 4 || words.length === 1) return 0.82;
  if (words.length === 2) return 0.72;
  return 0.65;
}

/**
 * Returns at most one channel — the top InnerTube channel hit — when it
 * plausibly matches the query; otherwise an empty list.
 */
export function pickBestGuessChannels(
  query: string,
  channels: ChannelSearchResult[],
): ChannelSearchResult[] {
  const top = channels[0];
  if (!top) return [];

  const score = scoreChannelQueryMatch(query, top);
  if (score < minAcceptScore(query)) return [];

  return [top];
}
