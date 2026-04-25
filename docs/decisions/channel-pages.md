# Channel Pages

## Decision

CleanTube supports dedicated channel pages at `/channel/[id]`. The first backend uses `youtubei.js`, but channel routes and UI depend on app-owned types in `src/lib/youtubeTypes.ts` rather than raw `youtubei.js` parser objects.

The channel backend lives in `src/lib/youtubeChannel.ts` and exposes normalized functions for channel details and channel videos. This keeps the page implementation stable if the fetcher later moves to the YouTube Data API.

## URL Shape

- Canonical channel ids route as `/channel/UC...`.
- Handles route as `/channel/%40handle` when a pasted channel URL contains an `@handle`.
- Search input redirects pasted channel URLs to channel pages when the URL can be recognized.
- Saved channels link to channel pages when they have a `channelId` or a parseable `channelUrl`; query-only saved channels remain search shortcuts.

## Backend Boundary

The app-owned channel contract is intentionally small:

```ts
type ChannelVideosPage = {
  channel: ChannelDetails;
  videos: VideoLikeForSummary[];
  sort: "latest" | "popular";
  pageToken?: string;
  nextPageToken?: string;
  previousPageToken?: string;
};
```

`youtubei.js` currently does not expose a durable opaque continuation token suitable for bookmarking. The initial implementation treats `pageToken` as a page number and walks continuations from the start. That is acceptable for shallow pagination but should be revisited if channel browsing becomes deep or high traffic.

## Data API Migration

The YouTube Data API does not require a meaningful product-plan change. It mainly changes the backend implementation behind `src/lib/youtubeChannel.ts`:

- `channels.list` can provide canonical metadata, thumbnails, counts, and uploads playlist ids.
- `playlistItems.list` can provide latest uploads from the uploads playlist.
- `videos.list` can enrich upload results with duration, live status, statistics, and ISO publish timestamps.
- `search.list` can support discovery and channel search, but it is more quota-expensive.

If CleanTube adopts the Data API, keep the route and UI contracts intact and add a second backend implementation that returns the same normalized types.

## Risks

- `youtubei.js` parser shapes can change when YouTube changes internal payloads.
- Channel handles, custom URLs, and user URLs are less canonical than `UC...` channel ids.
- Popular sorting depends on the sort filters exposed by the current `youtubei.js` channel feed.
- Page-number continuation is simple but inefficient for deep pages.
