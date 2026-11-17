/** Appended to the WKWebView UA by the iOS shell (`applicationNameForUserAgent`). */
export const NATIVE_APP_SHELL_UA_TOKEN = "CleanTubeNativeShell";

/** iOS/iPadOS device (Safari has no `beforeinstallprompt`). */
export function isIosDevice(userAgent?: string | null): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /iphone|ipod|ipad/i.test(ua);
}

/** Thin native iOS WKWebView shell (not Safari / not home-screen PWA). */
export function isNativeAppShell(userAgent?: string | null): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return ua.includes(NATIVE_APP_SHELL_UA_TOKEN);
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
  return isIosDevice() && !isStandalonePwa() && !isNativeAppShell();
}
