import type { VideoSummary } from "@/components/VideoSummary";

/**
 * Turns YouTube-style relative labels into an approximate **age in seconds**
 * (how long ago the upload was). Smaller = more recent.
 * Used only for ordering; not exact calendar dates.
 */
export function parseHumanUploadedAgeSeconds(
  raw: string | undefined | null,
): number | null {
  if (raw == null || !String(raw).trim()) return null;
  let s = String(raw).trim();
  s = s.replace(/^(streamed|premiered|posted|uploaded)\s+/i, "").trim();
  if (!s) return null;

  const lower = s.toLowerCase();
  if (/^live(\s|$)/.test(lower)) return 0;
  if (/just now|moments?\s+ago|^now$/i.test(s)) return 0;
  if (/\btoday\b/i.test(s)) return 8 * 3600;
  if (/\byesterday\b/i.test(s)) return 36 * 3600;

  const m = s.match(
    /^(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago$/i,
  );
  if (!m) return null;

  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 0) return null;
  const unit = m[2].toLowerCase().replace(/s$/, "");

  const mult: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 7 * 86400,
    month: 30 * 86400,
    year: 365 * 86400,
  };

  const factor = mult[unit];
  if (factor == null) return null;
  return n * factor;
}

function approxAgeForSort(v: VideoSummary): number {
  if (v.live) return -1;
  const parsed = parseHumanUploadedAgeSeconds(v.uploadedAt);
  if (parsed == null) return Number.MAX_SAFE_INTEGER;
  return parsed;
}

export type UploadDateSortMode = "relevance" | "newest" | "oldest";

export function sortVideoSummariesByUploadDate(
  videos: VideoSummary[],
  mode: UploadDateSortMode,
): VideoSummary[] {
  if (mode === "relevance") return [...videos];

  const copy = [...videos];
  copy.sort((a, b) => {
    const ageA = approxAgeForSort(a);
    const ageB = approxAgeForSort(b);
    if (mode === "newest") {
      return ageA - ageB;
    }
    return ageB - ageA;
  });
  return copy;
}

export function normalizeSortParam(
  raw: string | undefined | null,
): UploadDateSortMode {
  if (raw === "newest" || raw === "oldest") return raw;
  return "relevance";
}
