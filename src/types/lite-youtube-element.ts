export type LiteYoutubeElement = HTMLElement & {
  getYTPlayer: () => Promise<YT.Player>;
  /** Internal lite-youtube-embed state; present once the iframe has been built. */
  playerPromise?: Promise<YT.Player>;
  ytApiPromise?: Promise<unknown>;
};
