import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Roboto } from "next/font/google";
import { cookies } from "next/headers";
import { AppProviders } from "@/app/providers";
import { CloudLibraryProvider } from "@/context/CloudLibraryContext";
import {
  LIBRARY_SIDEBAR_COLLAPSED_COOKIE,
  parseLibrarySidebarCollapsedCookie,
} from "@/lib/librarySidebarPersistence";
import {
  parseWatchCommentsVisibleCookie,
  WATCH_COMMENTS_VISIBLE_COOKIE,
} from "@/lib/watchCommentsVisibilityPersistence";
import {
  WATCH_NARROW_PLAYER_LAYOUT_COOKIE,
  parseWatchNarrowPlayerLayoutCookie,
} from "@/lib/watchNarrowPlayerLayoutPersistence";
import { readWatchUpNextVisibleFromCookieStore } from "@/lib/watchUpNextVisibilityPersistence";
import {
  createInitialThemeSettings,
  THEME_MODE_COOKIE,
} from "@/lib/themePersistence";
import "./globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "CleanTube",
  description: "Search and watch YouTube videos with a clean, lightweight player",
  /** ICO + PNG first so Safari (poor SVG favicon support) picks a raster icon. */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const mode = cookieStore.get(THEME_MODE_COOKIE)?.value;
  const initialWatchCommentsVisible = parseWatchCommentsVisibleCookie(
    cookieStore.get(WATCH_COMMENTS_VISIBLE_COOKIE)?.value,
  );
  const initialWatchUpNextVisible =
    readWatchUpNextVisibleFromCookieStore(cookieStore);
  const watchNarrowPlayerLayoutCookie = cookieStore.get(
    WATCH_NARROW_PLAYER_LAYOUT_COOKIE,
  );
  const watchNarrowPlayerLayoutHasCookie =
    watchNarrowPlayerLayoutCookie != null;
  const initialWatchNarrowPlayerLayout = parseWatchNarrowPlayerLayoutCookie(
    watchNarrowPlayerLayoutCookie?.value,
  );
  const librarySidebarCookie = cookieStore.get(LIBRARY_SIDEBAR_COLLAPSED_COOKIE);
  const librarySidebarHasCookie = librarySidebarCookie != null;
  const initialLibrarySidebarCollapsed = parseLibrarySidebarCollapsedCookie(
    librarySidebarCookie?.value,
  );

  const initialTheme = createInitialThemeSettings({
    mode,
    hasStoredCookie: Boolean(mode),
  });

  return (
    <html
      lang="en"
      className={roboto.variable}
      data-theme={initialTheme.mode}
      suppressHydrationWarning
    >
      <body style={{ margin: 0 }}>
        <AppProviders
          initialTheme={initialTheme}
          initialWatchCommentsVisible={initialWatchCommentsVisible}
          initialWatchUpNextVisible={initialWatchUpNextVisible}
          initialWatchNarrowPlayerLayout={initialWatchNarrowPlayerLayout}
          initialLibrarySidebarCollapsed={initialLibrarySidebarCollapsed}
          librarySidebarHasCookie={librarySidebarHasCookie}
          watchNarrowPlayerLayoutHasCookie={watchNarrowPlayerLayoutHasCookie}
        >
          <CloudLibraryProvider>{children}</CloudLibraryProvider>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
