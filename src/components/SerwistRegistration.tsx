"use client";

import { SerwistProvider } from "@serwist/next/react";
import { useEffect } from "react";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Drop leftover localhost service workers so a dead `next start` cannot keep serving. */
function useUnregisterLocalhostServiceWorker() {
  useEffect(() => {
    if (!isLocalHostname(window.location.hostname)) return;
    if (!("serviceWorker" in navigator)) return;
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    })();
  }, []);
}

export function SerwistRegistration({
  children,
}: {
  children: React.ReactNode;
}) {
  useUnregisterLocalhostServiceWorker();
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
