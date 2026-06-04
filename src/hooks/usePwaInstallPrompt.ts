"use client";

import { useEffect, useState } from "react";

import { isIosSafariInstallable, isStandalonePwa } from "@/lib/pwaPlatform";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstallMode = "native" | "ios";

export function usePwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosInstallable, setIosInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandalonePwa()) {
      setInstalled(true);
      return;
    }

    if (isIosSafariInstallable()) {
      setIosInstallable(true);
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setInstallEvent(null);
      setIosInstallable(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function promptInstall(): Promise<boolean> {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
      return true;
    }
    return false;
  }

  const installMode: PwaInstallMode =
    iosInstallable && !installEvent ? "ios" : "native";

  return {
    canInstall: (Boolean(installEvent) || iosInstallable) && !installed,
    installMode,
    installed,
    iosInstallable,
    promptInstall,
  };
}
