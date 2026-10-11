import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import { SearchScrollRestore } from "@/components/SearchScrollRestore";
import { WatchRestoreOnLaunch } from "@/components/WatchRestoreOnLaunch";

export default function BrowseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <WatchRestoreOnLaunch />
      <Suspense fallback={null}>
        <SearchScrollRestore />
      </Suspense>
      {children}
    </AppShell>
  );
}
