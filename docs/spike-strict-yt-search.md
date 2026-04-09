# original prompt:
5. This one should be a spike before we implement anything-- sometimes the results from the scraper are different between searches. How could I ensure we 1) only get videos from the username passed in and 2) compare searches or store results between searches of the same query to in order to surface any differences between them? I'm thinking about potentially adding a strict search mode that searches based on specific username/handle and maybe it searches 2-5 times and stores and combines the results from each call, merges the results to handle duplicates, and then renders?

# Spike: stricter search, multi-fetch consistency, and diffing

Goal: reduce variance from HTML/InnerTube scraping and optionally scope results to a **single channel** (username / handle), plus **compare** or **merge** multiple runs of the “same” query.

## Why results differ between searches

- YouTube’s search endpoint is not a stable API; `youtube-sr` parses **HTML / embedded JSON** that can change shape, order, A/B tests, personalization hints, and rate limits.
- Two sequential requests for the same `q` can legitimately return **different ordered subsets** of the infinite result set.

So “same query” ≠ guaranteed identical ordered list.

## 1) Only videos from a specific username / handle

**Not reliably expressible as “plain `q`” alone.** Options:

| Approach | Idea | Pros / cons |
|----------|------|-------------|
| **Channel-scoped query** | Search with `q` like `channel:Foo official topic` or site patterns | Fragile; YouTube query syntax is not a documented contract. |
| **Resolve channel → channel id** | Use oEmbed, or a dedicated “channel URL → id” step, then only accept videos whose `channel.id` / `browseId` matches | **Strong filter** in *our* app after `Video[]` parse; requires reliable channel id resolution. |
| **Different upstream** | YouTube Data API v3 `search.list` with `channelId` | Official, stable filters; needs API key, quota, ToS. |
| **Strict mode UX** | User picks “channel” + “query within channel” (two fields) | Clear semantics; implement filter in `toVideoSummaries` / search pipeline. |

**Practical path in CleanTube today:** keep using `youtube-sr` for discovery, then **post-filter** by normalized channel id or canonical channel name match (with fuzzy rules and a visible “strict: dropped N non-matching rows” if you want transparency).

## 2) Compare searches or store results between runs

**Store:**

- Key: normalized query (+ optional `channelId`, `sort`, `strict` flag).
- Value: `{ fetchedAt, videoIds[], hashes?, rawFingerprint? }` in `sessionStorage` / IndexedDB (larger payloads).

**Compare:**

- Set ops: `added`, `removed`, `reordered` (by position).
- Optional: diff **metadata** (title, thumb URL) for the same `videoId` if the scraper returns different strings.

**UI:**

- Dev-only panel or “Compare with last run” for power users.
- Or automatic toast: “3 new results vs last search”.

## 3) “Strict search” + multi-fetch merge (2–5 calls)

**Algorithm sketch:**

1. User enables **Strict channel** (handle resolved to `channelId` once).
2. Run search **N times** (2–5), optionally with small **jitter/delay** to reduce identical cache responses.
3. For each run: map to `VideoSummary[]`, **filter** to `channelId === target` (if strict).
4. **Merge:**
   - Union by `videoId`.
   - **Score** each id: e.g. `score = count across runs * 100 - min(rank)` to prefer videos that appear in more runs and earlier.
   - Sort by score, then stable tie-break (title, etc.).
5. **Dedupe** thumbnails/titles already handled by id.

**Caveats:**

- Slower (N× latency) and heavier on YouTube (rate limits / blocks).
- Does **not** guarantee completeness; it reduces “one bad parse dropped everything” and smooths **single-run noise**.
- Should be **opt-in** (toggle “Stabilize results”) with N configurable.

## 4) Recommended implementation order

1. **Client/session persistence** of last result set ids for diffing (cheap).
2. **Post-filter by channel** after search when user supplies handle + resolved id.
3. Optional **multi-fetch merge** behind a flag with clear UX (“May take a few seconds”).

This spike does not change product code until you prioritize a slice (e.g. channel filter only, or merge only).
