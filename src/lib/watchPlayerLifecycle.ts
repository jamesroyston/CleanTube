/** Active watch player: stop on navigate-away click, release on unmount. */
let activeStop: (() => void) | null = null;

export function registerWatchPlayerStop(stop: () => void): () => void {
  activeStop = stop;
  return () => {
    if (activeStop === stop) activeStop = null;
  };
}

/** Silence playback before route change (destroy happens on unmount). */
export function stopActiveWatchPlayer(): void {
  activeStop?.();
}
