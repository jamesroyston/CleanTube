/** iOS/iPadOS device (Safari has no `beforeinstallprompt`). */
export function isIosDevice(userAgent?: string | null): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /iphone|ipod|ipad/i.test(ua);
}

/** Installed home-screen / standalone web app (incl. legacy iOS `navigator.standalone`). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    nav.standalone === true
  );
}

/** iOS Safari in a browser tab — show “Add to Home Screen” instructions. */
export function isIosSafariInstallable(): boolean {
  return isIosDevice() && !isStandalonePwa();
}
