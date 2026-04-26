import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { cookies } from "next/headers";
import { AppProviders } from "@/app/providers";
import { CloudLibraryProvider } from "@/context/CloudLibraryContext";
import {
  createInitialThemeSettings,
  THEME_DARK_PRESET_COOKIE,
  THEME_LIGHT_PRESET_COOKIE,
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
  const darkPresetId = cookieStore.get(THEME_DARK_PRESET_COOKIE)?.value;
  const lightPresetId = cookieStore.get(THEME_LIGHT_PRESET_COOKIE)?.value;
  const initialTheme = createInitialThemeSettings({
    mode,
    darkPresetId,
    lightPresetId,
    hasStoredCookie: Boolean(mode || darkPresetId || lightPresetId),
  });

  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body style={{ margin: 0 }}>
        <AppProviders initialTheme={initialTheme}>
          <CloudLibraryProvider>{children}</CloudLibraryProvider>
        </AppProviders>
      </body>
    </html>
  );
}
