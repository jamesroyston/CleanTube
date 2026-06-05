import { Analytics } from "@vercel/analytics/next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppProviders } from "@/app/providers";
import { SerwistRegistration } from "@/components/SerwistRegistration";
import { CloudLibraryProvider } from "@/context/CloudLibraryContext";
import {
  createInitialThemeSettings,
  THEME_MODE_STORAGE_KEY,
} from "@/lib/themePersistence";

type RootLayoutFallbackProps = {
  children: React.ReactNode;
};

const defaultTheme = createInitialThemeSettings({});

export function RootLayoutFallback({ children }: RootLayoutFallbackProps) {
  return (
    <>
      <InitColorSchemeScript
        attribute="data-theme"
        defaultMode={defaultTheme.mode}
        modeStorageKey={THEME_MODE_STORAGE_KEY}
      />
      <SerwistRegistration>
        <AppProviders
          initialTheme={defaultTheme}
          initialWatchCommentsVisible={true}
          initialWatchUpNextVisible={true}
          initialWatchNarrowPlayerLayout={false}
          initialLibrarySidebarCollapsed={false}
          initialCompactLayoutHint={{
            compactViewport: false,
            touchPrimary: false,
            mobileExperience: false,
          }}
          librarySidebarHasCookie={false}
          watchNarrowPlayerLayoutHasCookie={false}
        >
          <CloudLibraryProvider>{children}</CloudLibraryProvider>
        </AppProviders>
      </SerwistRegistration>
      <Analytics />
    </>
  );
}
