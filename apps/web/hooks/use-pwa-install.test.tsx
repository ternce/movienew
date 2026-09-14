import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PwaInstallProvider,
  usePwaInstall,
  type PwaInstallResult,
} from "./use-pwa-install";
import { PwaInstallAction } from "@/components/pwa/pwa-install-action";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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

  function setNavigatorValues({
    maxTouchPoints = 0,
    platform = "Win32",
    userAgent = "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36",
  }: {
    maxTouchPoints?: number;
    platform?: string;
    userAgent?: string;
  } = {}) {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      get: () => userAgent,
    });
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      get: () => platform,
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      get: () => maxTouchPoints,
    });
  }

  beforeEach(() => {
    listeners = new Map();
    mediaListeners = new Set();
    standaloneMatches = false;
    originalMatchMedia = window.matchMedia;
    setNavigatorValues();

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

  it("uses native prompt method on desktop when beforeinstallprompt is available", async () => {
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

    await waitFor(() => {
      expect(result.current.platform).toBe("desktop");
      expect(result.current.installMethod).toBe("native-prompt");
    });
  });

  it("uses native prompt method on Android when beforeinstallprompt is available", async () => {
    setNavigatorValues({
      userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36",
    });

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

    await waitFor(() => {
      expect(result.current.platform).toBe("android");
      expect(result.current.installMethod).toBe("native-prompt");
    });
  });

  it("uses iOS instructions without a deferred prompt on iPhone Safari", async () => {
    setNavigatorValues({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });

    const { result } = renderHook(() => usePwaInstall(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.platform).toBe("ios");
      expect(result.current.installMethod).toBe("ios-instructions");
    });
    expect(result.current.canInstall).toBe(false);
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

  it("desktop action appears only when native prompt is available", async () => {
    render(
      <PwaInstallProvider>
        <PwaInstallAction nativeOnly />
      </PwaInstallProvider>,
    );

    expect(
      screen.queryByRole("button", { name: /Установить SESH/i }),
    ).not.toBeInTheDocument();

    act(() => {
      callWindowListeners(
        listeners,
        "beforeinstallprompt",
        createBeforeInstallPromptEvent(),
      );
    });

    expect(
      await screen.findByRole("button", { name: /Установить SESH/i }),
    ).toBeInTheDocument();
  });

  it("mobile install action can render as a menu item", async () => {
    render(
      <PwaInstallProvider>
        <PwaInstallAction mobileMenuItem />
      </PwaInstallProvider>,
    );

    act(() => {
      callWindowListeners(
        listeners,
        "beforeinstallprompt",
        createBeforeInstallPromptEvent(),
      );
    });

    const action = await screen.findByRole("button", {
      name: /Установить SESH/i,
    });
    expect(action).toHaveClass("w-full");
  });

  it("iOS action opens installation instructions instead of calling prompt", async () => {
    setNavigatorValues({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });

    render(
      <PwaInstallProvider>
        <PwaInstallAction />
      </PwaInstallProvider>,
    );

    const action = await screen.findByRole("button", {
      name: /Установить SESH/i,
    });
    fireEvent.click(action);

    expect(
      screen.getByText(/Добавьте SESH на экран «Домой»/i),
    ).toBeInTheDocument();
  });

  it("iOS instruction dialog opens and closes", async () => {
    setNavigatorValues({
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPad",
      maxTouchPoints: 5,
    });

    render(
      <PwaInstallProvider>
        <PwaInstallAction />
      </PwaInstallProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /Установить SESH/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Закрыть/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("standalone mode hides install actions", async () => {
    standaloneMatches = true;

    render(
      <PwaInstallProvider>
        <PwaInstallAction />
      </PwaInstallProvider>,
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Установить SESH/i }),
      ).not.toBeInTheDocument();
    });
  });
});
