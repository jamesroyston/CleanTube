/** Bottom nav tab value for a pathname, or false when no tab should stay selected. */
export function bottomNavValueFromPathname(pathname: string): string | false {
  if (pathname === "/" || pathname.startsWith("/channel/")) {
    return "home";
  }
  if (
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname === "/history" ||
    pathname === "/watch-later"
  ) {
    return "library";
  }
  if (
    pathname === "/account" ||
    pathname === "/settings" ||
    pathname.startsWith("/auth")
  ) {
    return "account";
  }
  return false;
}
