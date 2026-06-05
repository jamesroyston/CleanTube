import { Analytics } from "@vercel/analytics/next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { cookies, headers } from "next/headers";
import { AppProviders } from "@/app/providers";
import { SerwistRegistration } from "@/components/SerwistRegistration";
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
  COMPACT_LAYOUT_HINT_COOKIE,
  resolveCompactLayoutHint,
} from "@/lib/compactLayoutHint";
import {
  createInitialThemeSettings,
  THEME_MODE_COOKIE,
  THEME_MODE_STORAGE_KEY,
} from "@/lib/themePersistence";

type RootLayoutDynamicProps = {
  children: React.ReactNode;
};

export async function RootLayoutDynamic({ children }: RootLayoutDynamicProps) {
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

  const headerList = await headers();
  const userAgent = headerList.get("user-agent");
  const initialCompactLayoutHint = resolveCompactLayoutHint(
    cookieStore.get(COMPACT_LAYOUT_HINT_COOKIE)?.value,
    userAgent,
  );

  return (
    <>
      <InitColorSchemeScript
        attribute="data-theme"
        defaultMode={initialTheme.mode}
        modeStorageKey={THEME_MODE_STORAGE_KEY}
      />
      <SerwistRegistration>
        <AppProviders
          initialTheme={initialTheme}
          initialWatchCommentsVisible={initialWatchCommentsVisible}
          initialWatchUpNextVisible={initialWatchUpNextVisible}
          initialWatchNarrowPlayerLayout={initialWatchNarrowPlayerLayout}
          initialLibrarySidebarCollapsed={initialLibrarySidebarCollapsed}
          initialCompactLayoutHint={initialCompactLayoutHint}
          librarySidebarHasCookie={librarySidebarHasCookie}
          watchNarrowPlayerLayoutHasCookie={watchNarrowPlayerLayoutHasCookie}
        >
          <CloudLibraryProvider>{children}</CloudLibraryProvider>
        </AppProviders>
      </SerwistRegistration>
      <Analytics />
    </>
  );
}
