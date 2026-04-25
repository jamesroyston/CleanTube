import { Suspense } from "react";

import { Header } from "@/components/Header";

function HeaderFallback() {
  return null;
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}
