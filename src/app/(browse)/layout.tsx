import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import { AppShellNavigationPolicy } from "@/components/AppShellNavigationPolicy";
import { SearchScrollRestore } from "@/components/SearchScrollRestore";
import { WatchLandscapeViewportFit } from "@/components/WatchLandscapeViewportFit";
import { WatchRestoreOnLaunch } from "@/components/WatchRestoreOnLaunch";

export default function BrowseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <AppShellNavigationPolicy />
      <WatchRestoreOnLaunch />
      <Suspense fallback={null}>
        <WatchLandscapeViewportFit />
        <SearchScrollRestore />
      </Suspense>
      {children}
    </AppShell>
  );
}
