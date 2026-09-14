import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PwaInstallProvider,
  usePwaInstall,
  type PwaInstallResult,
} from "./use-pwa-install";

type ListenerMap = Map<string, Set<EventListenerOrEventListenerObject>>;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PwaInstallProvider>{children}</PwaInstallProvider>;
  };
}

function createBeforeInstallPromptEvent(
  outcome: "accepted" | "dismissed" = "accepted",
) {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: "web" });
  vi.spyOn(event, "preventDefault");
  return event;
}

function callWindowListeners(
  listeners: ListenerMap,
  type: string,
  event: Event,
) {
  listeners.get(type)?.forEach((listener) => {
    if (typeof listener === "function") {
      listener(event);
    } else {
      listener.handleEvent(event);
    }
  });
}

describe("usePwaInstall", () => {
  let listeners: ListenerMap;
  let mediaListeners: Set<() => void>;
  let standaloneMatches: boolean;
  let originalMatchMedia: typeof window.matchMedia;
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    listeners = new Map();
    mediaListeners = new Set();
    standaloneMatches = false;
    originalMatchMedia = window.matchMedia;

    addEventSpy = vi
      .spyOn(window, "addEventListener")
      .mockImplementation((type, listener) => {
        const eventListeners = listeners.get(type) ?? new Set();
        eventListeners.add(listener);
        listeners.set(type, eventListeners);
      });
    removeEventSpy = vi
      .spyOn(window, "removeEventListener")
      .mockImplementation((type, listener) => {
        listeners.get(type)?.delete(listener);
      });

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)" && standaloneMatches,
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, listener: () => void) => {
          mediaListeners.add(listener);
        }),
        removeEventListener: vi.fn((_event: string, listener: () => void) => {
          mediaListeners.delete(listener);
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  it("captures beforeinstallprompt and prevents the automatic browser prompt", async () => {
    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });
    const promptEvent = createBeforeInstallPromptEvent();

    act(() => {
      callWindowListeners(listeners, "beforeinstallprompt", promptEvent);
    });

    await waitFor(() => expect(result.current.canInstall).toBe(true));
    expect(promptEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("invokes prompt only from install and handles accepted choice", async () => {
    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });
    const promptEvent = createBeforeInstallPromptEvent("accepted");

    act(() => {
      callWindowListeners(listeners, "beforeinstallprompt", promptEvent);
    });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    let installResult: PwaInstallResult | undefined;
    await act(async () => {
      installResult = await result.current.install();
    });

    expect(promptEvent.prompt).toHaveBeenCalledTimes(1);
    expect(installResult).toMatchObject({ outcome: "accepted", platform: "web" });
    expect(result.current.canInstall).toBe(false);
  });

  it("handles dismissed choice without leaving a consumed prompt available", async () => {
    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });
    const promptEvent = createBeforeInstallPromptEvent("dismissed");

    act(() => {
      callWindowListeners(listeners, "beforeinstallprompt", promptEvent);
    });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    await act(async () => {
      await result.current.install();
    });

    expect(result.current.lastResult).toMatchObject({ outcome: "dismissed" });
    expect(result.current.canInstall).toBe(false);
  });

  it("marks installed state when appinstalled fires", async () => {
    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });

    act(() => {
      callWindowListeners(
        listeners,
        "beforeinstallprompt",
        createBeforeInstallPromptEvent(),
      );
    });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    act(() => {
      callWindowListeners(listeners, "appinstalled", new Event("appinstalled"));
    });

    await waitFor(() => expect(result.current.isInstalled).toBe(true));
    expect(result.current.canInstall).toBe(false);
  });

  it("detects standalone display mode", async () => {
    standaloneMatches = true;

    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isStandalone).toBe(true));
    expect(result.current.isInstalled).toBe(true);
  });

  it("returns unavailable without browser prompt support", async () => {
    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });

    let installResult: PwaInstallResult | undefined;
    await act(async () => {
      installResult = await result.current.install();
    });

    expect(installResult).toEqual({ outcome: "unavailable" });
    expect(result.current.canInstall).toBe(false);
  });

  it("responds to display-mode changes", async () => {
    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });

    standaloneMatches = true;
    act(() => {
      mediaListeners.forEach((listener) => listener());
    });

    await waitFor(() => expect(result.current.isStandalone).toBe(true));
  });

  it("cleans up browser event listeners", () => {
    const { unmount } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(addEventSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    expect(removeEventSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    expect(removeEventSpy).toHaveBeenCalledWith(
      "appinstalled",
      expect.any(Function),
    );
  });
});
