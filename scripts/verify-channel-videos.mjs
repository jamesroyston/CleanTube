/**
 * Smoke-test: channel uploads tab must yield mappable items (Video nodes and/or LockupView VIDEO).
 * Run: `node scripts/verify-channel-videos.mjs` or `node scripts/verify-channel-videos.mjs <CHANNEL_ID>`
 * (defaults to a channel that historically relied on the RichGrid lockup path).
 */
import Innertube from "youtubei.js";
import { YTNodes } from "youtubei.js";

const CHANNEL_ID = process.argv[2]?.trim() || "UCR3sXK17qMK0zeTvqa_p5Ug";

const yt = await Innertube.create();
const ch = await yt.getChannel(CHANNEL_ID);
const feed = await ch.getVideos();
const nClassic = feed.videos?.length ?? 0;
const lockups = feed.memo?.getType?.(YTNodes.LockupView) ?? [];
const nLockVideo = lockups.filter((l) => l.content_type === "VIDEO").length;

if (nClassic === 0 && nLockVideo === 0) {
  console.error("FAIL: no classic videos and no VIDEO lockups on channel tab");
  process.exit(1);
}

console.log(
  `OK: classic=${nClassic} lockup_video=${nLockVideo} (RichGrid lockup path covered when classic is 0)`,
);
