export type LiteYoutubeElement = HTMLElement & {
  getYTPlayer: () => Promise<YT.Player>;
};
