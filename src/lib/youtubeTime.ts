/**
 * Parse YouTube-style time: seconds integer, "90s", "1h2m3s", "2m5s", etc.
 */
export function parseYouTubeTimeString(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }
  let total = 0;
  let matched = false;
  const hour = t.match(/(\d+)\s*h/i);
  const min = t.match(/(\d+)\s*m/i);
  const sec = t.match(/(\d+)\s*s/i);
  if (hour) {
    total += parseInt(hour[1], 10) * 3600;
    matched = true;
  }
  if (min) {
    total += parseInt(min[1], 10) * 60;
    matched = true;
  }
  if (sec) {
    total += parseInt(sec[1], 10);
    matched = true;
  }
  if (matched) return total;
  return undefined;
}

export function parseYouTubeTimeParam(
  t: string | null | undefined,
): number | undefined {
  if (t == null || !String(t).trim()) return undefined;
  return parseYouTubeTimeString(String(t).trim());
}

/** Read `t` or `start` from a pasted YouTube / watch-style URL. */
export function extractStartSecondsFromYoutubeInput(
  input: string,
): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    const href = trimmed.includes("://")
      ? trimmed
      : trimmed.startsWith("www.")
        ? `https://${trimmed}`
        : `https://youtube.com${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
    const u = new URL(href);
    const param = u.searchParams.get("t") ?? u.searchParams.get("start");
    return parseYouTubeTimeParam(param);
  } catch {
    return undefined;
  }
}

export function startSecondsFromWatchPageQuery(sp: {
  t?: string;
  start?: string;
}): number | undefined {
  return parseYouTubeTimeParam(sp.t ?? sp.start);
}
