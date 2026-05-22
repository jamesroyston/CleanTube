# Channel search: single best guess

## Problem

Showing four channel cards on every keyword search felt noisy. Many queries are video-intent; the channel tab’s #1 hit is often unrelated (e.g. `"apple"`, `"history"`).

## Approach

InnerTube channel search does not return explicit relevance scores. We:

1. Fetch **one** channel result (`searchChannels(query, 1)`).
2. Run a **local heuristic** (`scoreChannelQueryMatch`) on title + handle vs the query.
3. Show that card only if the score meets a threshold; otherwise show **no** channel row (videos only).

## Validator rules (summary)

- Normalize: lowercase, strip `@`, drop filler words (`official`, `channel`, …).
- High confidence: exact match, substring match, or strong token overlap.
- Stricter threshold for short or single-word queries (more false positives).

## Not practical today

- ML / embedding relevance without a new backend.
- Guaranteed correctness for ambiguous names without user confirmation UI.

## Future options

- “Did you mean {channel}?” confirm chip when score is borderline.
- Stricter mode using YouTube Data API `search.list` + `channelId` filter (see `docs/spike-strict-yt-search.md`).
