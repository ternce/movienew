"use client";

import * as React from "react";

type InstallOutcome = "accepted" | "dismissed" | "unavailable" | "error";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
}

export type PwaInstallResult = {
  outcome: InstallOutcome;
  platform?: string;
  error?: unknown;
};

type PwaInstallContextValue = {
  canInstall: boolean;
  isStandalone: boolean;
  isInstalled: boolean;
  isPrompting: boolean;
  lastResult: PwaInstallResult | null;
  install: () => Promise<PwaInstallResult>;
};

const unavailableInstallResult = { outcome: "unavailable" as const };

const PwaInstallContext = React.createContext<PwaInstallContextValue>({
  canInstall: false,
  isStandalone: false,
  isInstalled: false,
  isPrompting: false,
  lastResult: null,
  install: async () => unavailableInstallResult,
});

function getStandaloneState() {
  if (typeof window === "undefined") return false;

  const displayModeStandalone = window.matchMedia?.(
    "(display-mode: standalone)",
  ).matches;
  const navigatorStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  return Boolean(displayModeStandalone || navigatorStandalone);
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isPrompting, setIsPrompting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<PwaInstallResult | null>(
    null,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneQuery = window.matchMedia?.("(display-mode: standalone)");
    const syncStandalone = () => {
      const standalone = getStandaloneState();
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setLastResult(null);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setLastResult({ outcome: "accepted" });
    };

    syncStandalone();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (standaloneQuery?.addEventListener) {
      standaloneQuery.addEventListener("change", syncStandalone);
    } else if (standaloneQuery?.addListener) {
      standaloneQuery.addListener(syncStandalone);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (standaloneQuery?.removeEventListener) {
        standaloneQuery.removeEventListener("change", syncStandalone);
      } else if (standaloneQuery?.removeListener) {
        standaloneQuery.removeListener(syncStandalone);
      }
    };
  }, []);

  const install = React.useCallback(async (): Promise<PwaInstallResult> => {
    if (!deferredPrompt || isStandalone || isInstalled) {
      const result = unavailableInstallResult;
      setLastResult(result);
      return result;
    }

    const promptEvent = deferredPrompt;
    setIsPrompting(true);

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setDeferredPrompt(null);

      const result = {
        outcome: choice.outcome,
        platform: choice.platform,
      } satisfies PwaInstallResult;
      setLastResult(result);
      return result;
    } catch (error) {
      setDeferredPrompt(null);
      const result = { outcome: "error" as const, error };
      setLastResult(result);
      return result;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt, isInstalled, isStandalone]);

  const value = React.useMemo<PwaInstallContextValue>(() => ({
    canInstall: Boolean(deferredPrompt) && !isStandalone && !isInstalled,
    isStandalone,
    isInstalled,
    isPrompting,
    lastResult,
    install,
  }), [deferredPrompt, install, isInstalled, isPrompting, isStandalone, lastResult]);

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  return React.useContext(PwaInstallContext);
}
