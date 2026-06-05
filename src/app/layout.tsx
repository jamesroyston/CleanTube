import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { RootLayoutDynamic } from "@/app/RootLayoutDynamic";
import { RootLayoutFallback } from "@/app/RootLayoutFallback";
import {
  COMPACT_LAYOUT_BOOTSTRAP_SCRIPT,
} from "@/lib/compactLayoutBootstrap";
import { getThemeMetaColors } from "@/theme/tokens";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "CleanTube",
  description: "Search and watch YouTube videos with a clean, lightweight player",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CleanTube",
    statusBarStyle: "black-translucent",
  },
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

const lightMeta = getThemeMetaColors("light");
const darkMeta = getThemeMetaColors("dark");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /** iOS: shrink layout when keyboard opens (search overlay, auth). */
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: darkMeta.themeColor },
    { media: "(prefers-color-scheme: light)", color: lightMeta.themeColor },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={plusJakarta.variable}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: COMPACT_LAYOUT_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body style={{ margin: 0 }}>
        <Suspense fallback={<RootLayoutFallback>{children}</RootLayoutFallback>}>
          <RootLayoutDynamic>{children}</RootLayoutDynamic>
        </Suspense>
      </body>
    </html>
  );
}
