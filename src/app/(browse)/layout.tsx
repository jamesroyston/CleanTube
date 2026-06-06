import { Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import { SearchScrollRestore } from "@/components/SearchScrollRestore";

export default function BrowseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <SearchScrollRestore />
      </Suspense>
      {children}
    </AppShell>
  );
}
