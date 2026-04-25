# Library Sync Merge Follow-ups

## Decision

Sign-in sync now treats Watch Later and saved channels as additive merges. The client merges the local browser snapshot with the Supabase snapshot, then upserts the merged rows instead of deleting remote rows first.

Saved-channel merging now treats channel id, channel URL, and normalized search query as aliases for the same saved channel. When aliases overlap, the merged row keeps the richer metadata available across both copies.

Watch Later merging now combines duplicate video rows by keeping the newest `addedAt` record while preserving useful metadata from either side, including non-placeholder title/channel text, thumbnail URL, and resume start seconds.

## Future Investigation

- Deletions still use replace-style writes so explicit remove and clear actions can propagate. If multi-device conflict handling becomes important, add tombstones or per-row deleted markers instead of full replacement.
- The sign-in sync flow is not transactional across Watch Later, saved channels, and watch progress. If partial sync failures become visible, move the merge to a server action or Supabase function with clearer retry behavior.
- `localStorage` remains the anonymous data source before sign-in. Large libraries may eventually need IndexedDB to avoid blocking JSON snapshot reads and writes.
- Watch progress still favors latest update time while preserving the furthest known position and completed state. More precise cross-device conflict behavior may require separate event timestamps for position, completion, and last watched time.
- Saved-channel aliases depend on the metadata currently stored locally. A future channel page can backfill canonical channel ids for query-only saved channels to reduce ambiguity further.
