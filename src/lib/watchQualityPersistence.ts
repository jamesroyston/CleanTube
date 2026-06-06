export const WATCH_QUALITY_STORAGE_KEY = "cleantube-watch-quality";

export type WatchQualityPreference =
  | "auto"
  | "hd1080"
  | "hd720"
  | "large"
  | "medium"
  | "small";

const VALID: WatchQualityPreference[] = [
  "auto",
  "hd1080",
  "hd720",
  "large",
  "medium",
  "small",
];

export function readWatchQualityPreference(): WatchQualityPreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(WATCH_QUALITY_STORAGE_KEY);
    if (raw && VALID.includes(raw as WatchQualityPreference)) {
      return raw as WatchQualityPreference;
    }
  } catch {
    /* ignore */
  }
  return "auto";
}

export function writeWatchQualityPreference(
  quality: WatchQualityPreference,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WATCH_QUALITY_STORAGE_KEY, quality);
  } catch {
    /* ignore */
  }
}
