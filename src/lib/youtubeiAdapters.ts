import type { YT } from "youtubei.js";

import { canonicalYoutubeThumbnailUrl, preferredYoutubeThumbnailPath } from "@/lib/serializeVideo";
import type { VideoLikeForSummary, WatchVideoDetails } from "@/lib/youtubeTypes";

type Thumbnailish = { url: string };

function collectThumbnailUrls(thumbs: Thumbnailish[] | undefined): string[] {
  if (!thumbs?.length) return [];
  const out: string[] = [];
  for (const t of thumbs) {
    if (!t?.url) continue;
    try {
      const c = canonicalYoutubeThumbnailUrl(t.url);
      if (!out.includes(c)) out.push(c);
    } catch {
      /* skip */
    }
  }
  return out;
}

function durationTextFromFeedEntry(v: {
  duration?: unknown;
}): string {
  const d = v.duration;
  if (
    d &&
    typeof d === "object" &&
    d !== null &&
    "text" in d &&
    typeof (d as { text: unknown }).text === "string"
  ) {
    return (d as { text: string }).text;
  }
  if (
    d &&
    typeof d === "object" &&
    d !== null &&
    typeof (d as { toString?: () => string }).toString === "function"
  ) {
    const s = (d as { toString: () => string }).toString();
    if (s) return s;
  }
  return "—";
}

function isLiveFeedEntry(v: object): boolean {
  return (
    "is_live" in v &&
    (v as { is_live?: boolean }).is_live === true
  );
}

const FEED_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

function textish(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toString?: () => string }).toString === "function"
  ) {
    const s = String((value as { toString: () => string }).toString()).trim();
    return s && s !== "[object Object]" ? s : undefined;
  }
  return undefined;
}

function thumbnailUrlsFromLockupContentImage(ci: unknown): string[] {
  if (!ci || typeof ci !== "object") return [];
  const o = ci as Record<string, unknown>;
  if (o.type === "ThumbnailView" && Array.isArray(o.image)) {
    return collectThumbnailUrls(o.image as Thumbnailish[]);
  }
  if (o.type === "CollectionThumbnailView" && o.primary_thumbnail) {
    return thumbnailUrlsFromLockupContentImage(o.primary_thumbnail);
  }
  return [];
}

function durationFromLockupThumbnail(contentImage: unknown): string {
  if (!contentImage || typeof contentImage !== "object") return "—";
  const { overlays } = contentImage as {
    overlays?: unknown[];
  };
  if (!Array.isArray(overlays)) return "—";
  for (const ov of overlays) {
    if (!ov || typeof ov !== "object") continue;
    const kind = (ov as { type?: string }).type;
    if (kind !== "ThumbnailBottomOverlayView") continue;
    const badges = (ov as { badges?: unknown[] }).badges;
    if (!Array.isArray(badges)) continue;
    for (const b of badges) {
      if (!b || typeof b !== "object") continue;
      const t = (b as { text?: string }).text;
      if (typeof t === "string" && /^\d+:\d{2}(:\d{2})?$/.test(t.trim())) {
        return t.trim();
      }
    }
  }
  return "—";
}

function uploadedAtFromLockupMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const meta = metadata as Record<string, unknown>;
  const cm = meta.metadata;
  if (!cm || typeof cm !== "object") return undefined;
  const rows = (cm as { metadata_rows?: unknown[] }).metadata_rows;
  for (const row of rows ?? []) {
    if (!row || typeof row !== "object") continue;
    const parts = (row as { metadata_parts?: unknown[] }).metadata_parts;
    for (const part of parts ?? []) {
      if (!part || typeof part !== "object") continue;
      const t = textish((part as { text?: unknown }).text);
      if (
        t &&
        (/\bago\b/i.test(t) ||
          /\b(today|yesterday|just now)\b/i.test(t) ||
          /^(streamed|premiered|posted|uploaded)\b/i.test(t) ||
          /\bscheduled\b/i.test(t))
      ) {
        return t;
      }
    }
  }
  return undefined;
}

/**
 * Rich grid channel tabs expose uploads as {@link LockupView} (not `Video` / `GridVideo`).
 * `Feed#get videos` does not include those nodes; map lockups here.
 */
export function lockupViewVideoToVideoLike(v: unknown): VideoLikeForSummary | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.type !== "LockupView") return null;
  const ct = typeof o.content_type === "string" ? o.content_type : "";
  if (ct !== "VIDEO") return null;
  const id = typeof o.content_id === "string" ? o.content_id.trim() : "";
  if (!FEED_VIDEO_ID.test(id)) return null;

  const md = o.metadata as Record<string, unknown> | undefined;
  const title = md ? textish(md.title) : undefined;

  const thumbnailUrls = thumbnailUrlsFromLockupContentImage(o.content_image);
  const durationFormatted = durationFromLockupThumbnail(o.content_image);
  const uploadedAt = md ? uploadedAtFromLockupMetadata(md) : undefined;

  return {
    id,
    kind: "video",
    title,
    channelName: "Unknown channel",
    durationFormatted,
    uploadedAt,
    live: false,
    thumbnailUrls,
  };
}

/**
 * Rich grid Shorts lockups expose `content_type: "SHORT"` with the same core fields as video lockups.
 */
function videoIdFromNavigationEndpoint(endpoint: unknown): string | null {
  if (!endpoint || typeof endpoint !== "object") return null;
  const ep = endpoint as { payload?: unknown; toURL?: () => string | undefined };
  const payload = ep.payload;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const key of ["videoId", "video_id"]) {
      const id = p[key];
      if (typeof id === "string" && FEED_VIDEO_ID.test(id.trim())) return id.trim();
    }
  }
  const url = typeof ep.toURL === "function" ? ep.toURL() : undefined;
  if (url) {
    const fromShortsPath = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (fromShortsPath?.[1] && FEED_VIDEO_ID.test(fromShortsPath[1])) {
      return fromShortsPath[1];
    }
  }
  return null;
}

/** Innertube often uses `shorts-shelf-item-{videoId}` rather than a bare id. */
function videoIdFromShortEntityId(entityId: string): string | null {
  const trimmed = entityId.trim();
  if (FEED_VIDEO_ID.test(trimmed)) return trimmed;
  const shelfMatch = trimmed.match(/(?:^|[-_/])([a-zA-Z0-9_-]{11})$/);
  if (shelfMatch?.[1] && FEED_VIDEO_ID.test(shelfMatch[1])) return shelfMatch[1];
  return null;
}

export function lockupViewShortToVideoLike(v: unknown): VideoLikeForSummary | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.type !== "LockupView") return null;
  const ct = typeof o.content_type === "string" ? o.content_type : "";
  if (ct !== "SHORT") return null;
  const id = typeof o.content_id === "string" ? o.content_id.trim() : "";
  if (!FEED_VIDEO_ID.test(id)) return null;

  const md = o.metadata as Record<string, unknown> | undefined;
  const title = md ? textish(md.title) : undefined;
  const thumbnailUrls = thumbnailUrlsFromLockupContentImage(o.content_image);
  const uploadedAt = md ? uploadedAtFromLockupMetadata(md) : undefined;

  return {
    id,
    kind: "short",
    title,
    channelName: "Unknown channel",
    durationFormatted: "SHORT",
    uploadedAt,
    live: false,
    thumbnailUrls,
  };
}

/** Channel Shorts tabs often return {@link ShortsLockupView} instead of SHORT {@link LockupView}. */
export function shortsLockupViewToVideoLike(v: unknown): VideoLikeForSummary | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.type !== "ShortsLockupView") return null;

  const entityId = typeof o.entity_id === "string" ? o.entity_id.trim() : "";
  const id =
    videoIdFromShortEntityId(entityId) ??
    videoIdFromNavigationEndpoint(o.on_tap_endpoint) ??
    videoIdFromNavigationEndpoint(o.inline_player_data);
  if (!id) return null;

  const overlay = o.overlay_metadata as Record<string, unknown> | undefined;
  const title = textish(overlay?.primary_text) ?? "Short";
  const channelName = textish(overlay?.secondary_text) ?? "Unknown channel";
  const thumbnailUrls = collectThumbnailUrls(
    o.thumbnail as Thumbnailish[] | undefined,
  );

  return {
    id,
    kind: "short",
    title,
    channelName,
    durationFormatted: "SHORT",
    live: false,
    thumbnailUrls,
  };
}

/** Reel shelf items on channel Shorts surfaces. */
export function reelItemToVideoLike(v: unknown): VideoLikeForSummary | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.type !== "ReelItem") return null;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!FEED_VIDEO_ID.test(id)) return null;

  const title = textish(o.title) ?? "Short";
  const thumbnailUrls = collectThumbnailUrls(o.thumbnails as Thumbnailish[] | undefined);
  const viewsText = textish(o.views);

  return {
    id,
    kind: "short",
    title,
    channelName: "Unknown channel",
    durationFormatted: viewsText ?? "SHORT",
    live: false,
    thumbnailUrls,
  };
}

/** Map any known Shorts node shape from channel tabs or watch-next. */
export function shortFeedItemToVideoLike(v: unknown): VideoLikeForSummary | null {
  return (
    shortsLockupViewToVideoLike(v) ??
    reelItemToVideoLike(v) ??
    lockupViewShortToVideoLike(v)
  );
}

function extractVideoIdFromChannelFeedNode(
  node: unknown,
  depth = 0,
  seen: WeakSet<object> | null = null,
): string | null {
  if (node == null || depth > 8) return null;

  if (typeof node === "string") {
    return FEED_VIDEO_ID.test(node) ? node : null;
  }
  if (typeof node !== "object") return null;

  const obj = node as object;
  const tracker = seen ?? new WeakSet<object>();
  if (tracker.has(obj)) return null;
  tracker.add(obj);

  const o = node as Record<string, unknown>;
  if (typeof o.id === "string" && FEED_VIDEO_ID.test(o.id)) return o.id;
  if (typeof o.video_id === "string" && FEED_VIDEO_ID.test(o.video_id)) {
    return o.video_id;
  }

  const basic = o.basic_info;
  if (basic && typeof basic === "object") {
    const bi = basic as Record<string, unknown>;
    if (typeof bi.id === "string" && FEED_VIDEO_ID.test(bi.id)) return bi.id;
  }

  for (const v of Object.values(o)) {
    if (!v || typeof v !== "object") continue;
    const rec = v as Record<string, unknown>;
    if (typeof rec.videoId === "string" && FEED_VIDEO_ID.test(rec.videoId)) {
      return rec.videoId;
    }
    const we = rec.watchEndpoint;
    if (we && typeof we === "object") {
      const vid = (we as { videoId?: string }).videoId;
      if (typeof vid === "string" && FEED_VIDEO_ID.test(vid)) return vid;
    }
  }

  for (const v of Object.values(o)) {
    if (v && typeof v === "object") {
      const found = extractVideoIdFromChannelFeedNode(v, depth + 1, tracker);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Maps a search-feed video node (Video, CompactVideo, GridVideo, …) into our summary shape.
 */
export function feedVideoToVideoLike(v: unknown): VideoLikeForSummary | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !FEED_VIDEO_ID.test(id)) return null;

  const title =
    o.title &&
    typeof o.title === "object" &&
    o.title !== null &&
    typeof (o.title as { toString?: () => string }).toString === "function"
      ? String((o.title as { toString: () => string }).toString())
      : undefined;

  let channelName = "Unknown channel";
  const author = o.author;
  if (
    author &&
    typeof author === "object" &&
    author !== null &&
    typeof (author as { name?: string }).name === "string"
  ) {
    channelName = (author as { name: string }).name.trim() || channelName;
  }

  let uploadedAt: string | undefined;
  if (
    o.published &&
    typeof o.published === "object" &&
    o.published !== null &&
    typeof (o.published as { toString?: () => string }).toString === "function"
  ) {
    const p = String((o.published as { toString: () => string }).toString()).trim();
    if (p) uploadedAt = p;
  }

  const thumbs = o.thumbnails as Thumbnailish[] | undefined;
  let thumbnailUrls = collectThumbnailUrls(thumbs);
  const best =
    o.best_thumbnail &&
    typeof o.best_thumbnail === "object" &&
    o.best_thumbnail !== null &&
    typeof (o.best_thumbnail as { url?: string }).url === "string"
      ? (o.best_thumbnail as { url: string }).url
      : undefined;
  if (best) {
    try {
      const c = canonicalYoutubeThumbnailUrl(best);
      thumbnailUrls = [c, ...thumbnailUrls.filter((u) => u !== c)];
    } catch {
      /* ignore */
    }
  }

  const live = isLiveFeedEntry(o);
  const durationFormatted = live ? "LIVE" : durationTextFromFeedEntry(o);

  return {
    id,
    kind: "video",
    title,
    channelName,
    durationFormatted,
    uploadedAt,
    live,
    thumbnailUrls,
  };
}

/**
 * Channel tab feeds sometimes omit a top-level `id`; walk renderer-shaped nodes for a watch id.
 */
export function channelFeedVideoToVideoLike(v: unknown): VideoLikeForSummary | null {
  const direct = feedVideoToVideoLike(v);
  if (direct) return direct;
  const fromLockup = lockupViewVideoToVideoLike(v);
  if (fromLockup) return fromLockup;
  const extracted = extractVideoIdFromChannelFeedNode(v);
  if (!extracted || typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const merged = { ...o, id: extracted };
  return feedVideoToVideoLike(merged);
}

export function formatYoutubeDurationSeconds(total: number | undefined): string {
  if (total == null || !Number.isFinite(total) || total < 0) return "—";
  const s = Math.floor(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

function channelThumbnailUrlFromVideoInfo(info: YT.VideoInfo): string | undefined {
  const author = info.secondary_info?.owner?.author;
  if (!author) return undefined;
  const best = author.best_thumbnail;
  if (best?.url) {
    try {
      return canonicalYoutubeThumbnailUrl(best.url);
    } catch {
      return undefined;
    }
  }
  const thumbs = author.thumbnails;
  const last = thumbs?.length ? thumbs[thumbs.length - 1] : undefined;
  if (last?.url) {
    try {
      return canonicalYoutubeThumbnailUrl(last.url);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function videoInfoToWatchDetails(
  info: YT.VideoInfo,
  id: string,
): WatchVideoDetails {
  const bi = info.basic_info;
  const live = Boolean(bi.is_live || bi.is_live_content);
  const title = bi.title?.trim() || "Video";
  const channel = bi.channel;
  const channelName = channel?.name?.trim() || bi.author?.trim() || "Unknown channel";
  const channelId = channel?.id;
  const channelUrl = channel?.url;
  const channelThumbnailUrl = channelThumbnailUrlFromVideoInfo(info);

  const thumbList = collectThumbnailUrls(
    bi.thumbnail as Thumbnailish[] | undefined,
  );
  const uploadedAt =
    info.primary_info?.relative_date?.toString()?.trim() ||
    info.primary_info?.published?.toString()?.trim() ||
    undefined;

  const videoLike: VideoLikeForSummary = {
    id,
    kind: "video",
    title,
    channelName,
    durationFormatted: live ? "LIVE" : formatYoutubeDurationSeconds(bi.duration),
    uploadedAt,
    live,
    thumbnailUrls: thumbList,
  };

  const description =
    info.secondary_info?.description?.toString()?.trim() ||
    bi.short_description?.trim();

  return {
    id,
    title,
    channelName,
    channelId,
    channelUrl,
    channelThumbnailUrl,
    uploadedAt,
    views: bi.view_count ?? 0,
    description: description || undefined,
    thumbnailUrl: preferredYoutubeThumbnailPath(id, videoLike),
    source: "youtubei.js",
  };
}
