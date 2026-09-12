import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  usePlayer,
  type PlaybackLocalAction,
  type PlaybackRemoteCommand,
} from "../use-player";

const AUTOPLAY_BLOCKED_MESSAGE = "Нажмите, чтобы синхронизировать воспроизведение";

const storeActions = vi.hoisted(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  setCurrentTime: vi.fn(),
  setDuration: vi.fn(),
  setBufferedTime: vi.fn(),
  setBuffering: vi.fn(),
  setEnded: vi.fn(),
  setError: vi.fn(),
  setAutoplayBlocked: vi.fn(),
  setPlayPending: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  setQuality: vi.fn(),
  setAvailableQualities: vi.fn(),
  setFullscreen: vi.fn(),
  setPictureInPicture: vi.fn(),
  showControls: vi.fn(),
  hideControls: vi.fn(),
  updateActivity: vi.fn(),
}));

vi.mock("hls.js", () => ({
  default: {
    isSupported: () => false,
  },
}));

vi.mock("@/stores/player.store", () => ({
  usePlayerStore: () => ({
    ...storeActions,
    isPlaying: false,
    volume: 1,
    isMuted: false,
    playbackSpeed: 1,
    isFullscreen: false,
    isControlsVisible: true,
  }),
}));

type VideoState = {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  readyState: number;
  playbackRate?: number;
  error?: MediaError | null;
};

function installVideoState(
  video: HTMLVideoElement,
  state: VideoState,
  playImpl?: () => Promise<void>,
) {
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => state.currentTime,
    set: (value: number) => {
      state.currentTime = value;
    },
  });
  Object.defineProperty(video, "duration", {
    configurable: true,
    get: () => state.duration,
  });
  Object.defineProperty(video, "paused", {
    configurable: true,
    get: () => state.paused,
  });
  Object.defineProperty(video, "ended", {
    configurable: true,
    get: () => state.ended,
  });
  Object.defineProperty(video, "error", {
    configurable: true,
    get: () => state.error ?? null,
  });
  Object.defineProperty(video, "readyState", {
    configurable: true,
    get: () => state.readyState,
  });
  Object.defineProperty(video, "playbackRate", {
    configurable: true,
    get: () => state.playbackRate ?? 1,
    set: (value: number) => {
      state.playbackRate = value;
    },
  });
  Object.defineProperty(video, "canPlayType", {
    configurable: true,
    value: () => "probably",
  });
  Object.defineProperty(video, "play", {
    configurable: true,
    value: vi.fn(() => {
      if (playImpl) return playImpl();
      state.paused = false;
      state.ended = false;
      return Promise.resolve();
    }),
  });
  Object.defineProperty(video, "pause", {
    configurable: true,
    value: vi.fn(() => {
      state.paused = true;
    }),
  });
}

function command(
  sequence: number,
  playbackStatus: "PLAYING" | "PAUSED",
  currentTime: number,
  type: PlaybackRemoteCommand["type"] = "state",
  options: Partial<PlaybackRemoteCommand> = {},
): PlaybackRemoteCommand {
  return {
    id: `${sequence}:${type}`,
    type,
    playbackStatus,
    currentTime,
    playbackRate: 1,
    ...options,
  };
}

function Harness({
  src = "test.m3u8",
  remoteCommand,
  onPlaybackAction,
  onError,
}: {
  src?: string;
  remoteCommand?: PlaybackRemoteCommand | null;
  onPlaybackAction?: (action: PlaybackLocalAction) => void;
  onError?: (message: string) => void;
}) {
  const { videoRef, togglePlayPause, retryBlockedAutoplay, seek } = usePlayer({
    src,
    remoteCommand,
    onPlaybackAction,
    onError,
  });

  return (
    <>
      <video ref={videoRef} data-testid="video" />
      <button type="button" onClick={togglePlayPause}>
        toggle
      </button>
      <button type="button" onClick={retryBlockedAutoplay}>
        retry
      </button>
      <button type="button" onClick={() => seek(42)}>
        seek
      </button>
    </>
  );
}

describe("usePlayer Watch Party remote sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps UI unconfirmed after play until the playing event fires", async () => {
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    await act(async () => {
      screen.getByRole("button", { name: "toggle" }).click();
    });
    act(() => {
      video.dispatchEvent(new Event("play"));
    });

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(storeActions.setPlayPending).toHaveBeenCalledWith(true);
    expect(storeActions.play).not.toHaveBeenCalled();

    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
      video.dispatchEvent(new Event("playing"));
    });

    expect(storeActions.play).toHaveBeenCalledTimes(1);
    expect(storeActions.setAutoplayBlocked).toHaveBeenCalledWith(null);
  });

  it("does not confirm playback while video.play remains pending", async () => {
    const playPromise = new Promise<void>(() => undefined);
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    installVideoState(video, {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    }, () => playPromise);

    await act(async () => {
      screen.getByRole("button", { name: "toggle" }).click();
    });

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(storeActions.setPlayPending).toHaveBeenCalledWith(true);
    expect(storeActions.play).not.toHaveBeenCalled();
  });

  it("clears pending state and confirms playback when media starts", async () => {
    vi.useFakeTimers();
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 3,
    };
    installVideoState(video, state);

    act(() => {
      video.dispatchEvent(new Event("play"));
    });
    expect(storeActions.setPlayPending).toHaveBeenCalledWith(true);
    expect(storeActions.play).not.toHaveBeenCalled();

    act(() => {
      video.dispatchEvent(new Event("playing"));
    });

    expect(storeActions.play).toHaveBeenCalledTimes(1);
    expect(storeActions.setAutoplayBlocked).toHaveBeenLastCalledWith(null);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(storeActions.hideControls).toHaveBeenCalledTimes(1);
  });

  it("does not auto-hide controls while paused", () => {
    vi.useFakeTimers();
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 3,
    };
    installVideoState(video, state);

    act(() => {
      video.dispatchEvent(new Event("pause"));
      vi.advanceTimersByTime(3000);
    });

    expect(storeActions.pause).toHaveBeenCalled();
    expect(storeActions.hideControls).not.toHaveBeenCalled();
  });

  it("uses an advancing timeupdate as playback confirmation when playing is missed", () => {
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 1,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 3,
    };
    installVideoState(video, state);

    act(() => {
      video.dispatchEvent(new Event("play"));
      video.dispatchEvent(new Event("timeupdate"));
    });

    expect(storeActions.setPlayPending).toHaveBeenCalledWith(true);
    expect(storeActions.play).toHaveBeenCalledTimes(1);
  });

  it("applies host play to a guest media element", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(1, "PLAYING", 5, "play")} />);
    await act(async () => {});

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(state.currentTime).toBe(5);
    expect(state.paused).toBe(false);
  });

  it("applies host pause immediately", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 8,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(2, "PAUSED", 8, "pause")} />);
    await act(async () => {});

    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(state.paused).toBe(true);
  });

  it("keeps paused authoritative time from advancing with server time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:10.000Z"));
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 3,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(
      <Harness
        remoteCommand={command(7, "PAUSED", 12, "pause", {
          authoritativeCurrentTime: 2,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
      />,
    );
    await act(async () => {});

    expect(state.currentTime).toBe(2);
    expect(state.paused).toBe(true);
  });

  it("hard-corrects even small drift when paused", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 2.1,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(8, "PAUSED", 2, "pause")} />);
    await act(async () => {});

    expect(state.currentTime).toBe(2);
    expect(state.paused).toBe(true);
  });

  it("advances playing commands from authoritative server time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:01.000Z"));
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(
      <Harness
        remoteCommand={command(9, "PLAYING", 2, "state", {
          authoritativeCurrentTime: 2,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
      />,
    );
    await act(async () => {});

    expect(state.currentTime).toBe(3);
    expect(state.paused).toBe(false);
  });

  it("recomputes delayed remote play target when media actually starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    rerender(
      <Harness
        remoteCommand={command(22, "PLAYING", 5, "play", {
          authoritativeCurrentTime: 5,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
      />,
    );
    await act(async () => {});
    expect(state.currentTime).toBe(5);

    vi.setSystemTime(new Date("2026-08-27T12:00:02.000Z"));
    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
      video.dispatchEvent(new Event("playing"));
    });

    expect(state.currentTime).toBe(7);
    expect(storeActions.play).toHaveBeenCalled();
  });

  it("does not hard snap below the ignore threshold when remote play starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    rerender(
      <Harness
        remoteCommand={command(23, "PLAYING", 5, "play", {
          authoritativeCurrentTime: 5,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
      />,
    );
    await act(async () => {});
    vi.clearAllMocks();

    vi.setSystemTime(new Date("2026-08-27T12:00:00.100Z"));
    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
      video.dispatchEvent(new Event("playing"));
    });

    expect(state.currentTime).toBe(5);
    expect(storeActions.setCurrentTime).not.toHaveBeenCalled();
    expect(storeActions.play).toHaveBeenCalled();
  });

  it("hard-corrects delayed remote play drift at the playing event", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    rerender(
      <Harness
        remoteCommand={command(24, "PLAYING", 12, "play", {
          authoritativeCurrentTime: 12,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
      />,
    );
    await act(async () => {});
    expect(state.currentTime).toBe(12);

    vi.setSystemTime(new Date("2026-08-27T12:00:01.250Z"));
    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
      video.dispatchEvent(new Event("playing"));
    });

    expect(state.currentTime).toBe(13.25);
    expect(storeActions.setCurrentTime).toHaveBeenLastCalledWith(13.25);
  });

  it("uses soft playback-rate correction for medium playing drift", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 10,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
      playbackRate: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(10, "PLAYING", 10.4)} />);
    await act(async () => {});

    expect(state.currentTime).toBe(10);
    expect(state.playbackRate).toBeGreaterThan(1);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(state.playbackRate).toBe(1);
  });

  it("hard-corrects large playing drift", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 10,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
      playbackRate: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(11, "PLAYING", 11)} />);
    await act(async () => {});

    expect(state.currentTime).toBe(11);
    expect(state.playbackRate).toBe(1);
  });

  it("cancels soft correction when a pause arrives", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 10,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
      playbackRate: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(12, "PLAYING", 10.4)} />);
    await act(async () => {});
    expect(state.playbackRate).toBeGreaterThan(1);

    rerender(<Harness remoteCommand={command(13, "PAUSED", 10.4, "pause")} />);
    await act(async () => {});

    expect(state.currentTime).toBe(10.4);
    expect(state.playbackRate).toBe(1);
    expect(state.paused).toBe(true);
  });

  it("hard-corrects even small drift when seeking", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 2.2,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(14, "PAUSED", 2.1, "seek")} />);
    await act(async () => {});

    expect(state.currentTime).toBe(2.1);
    expect(state.paused).toBe(true);
  });

  it("keeps the latest rapid play/pause command authoritative", async () => {
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    rerender(<Harness remoteCommand={command(3, "PLAYING", 10, "play")} />);
    rerender(<Harness remoteCommand={command(4, "PAUSED", 10, "pause")} />);
    expect(state.paused).toBe(true);

    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
    });

    expect(state.paused).toBe(true);
  });

  it("stores a command received before metadata and applies the latest one when ready", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: Number.NaN,
      paused: true,
      ended: false,
      readyState: 0,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(5, "PLAYING", 18, "play")} />);
    rerender(<Harness remoteCommand={command(6, "PLAYING", 22, "play")} />);
    expect(video.play).not.toHaveBeenCalled();

    act(() => {
      state.readyState = 1;
      state.duration = 120;
      video.dispatchEvent(new Event("loadedmetadata"));
    });
    await act(async () => {});

    expect(state.currentTime).toBe(22);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("replays an ended video from the start with one local host action", async () => {
    vi.useFakeTimers();
    const onPlaybackAction = vi.fn();
    render(<Harness remoteCommand={null} onPlaybackAction={onPlaybackAction} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 120,
      duration: 120,
      paused: true,
      ended: true,
      readyState: 1,
    };
    installVideoState(video, state);

    act(() => {
      video.dispatchEvent(new Event("canplay"));
      vi.advanceTimersByTime(950);
    });

    await act(async () => {
      screen.getByRole("button", { name: "toggle" }).click();
    });

    expect(state.currentTime).toBe(0);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(onPlaybackAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "play", currentTime: 0 }),
    );
  });

  it("keeps pause authoritative when seeking while paused", async () => {
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 5,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);

    rerender(<Harness remoteCommand={command(6, "PAUSED", 55, "seek")} />);
    await act(async () => {});

    expect(state.currentTime).toBe(55);
    expect(state.paused).toBe(true);
  });

  it("does not treat remote autoplay rejection as a fatal media error", async () => {
    const onError = vi.fn();
    const blocked = new DOMException("gesture required", "NotAllowedError");
    const { rerender } = render(<Harness remoteCommand={null} onError={onError} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => Promise.reject(blocked));
    vi.clearAllMocks();

    rerender(<Harness remoteCommand={command(20, "PLAYING", 5, "play")} onError={onError} />);
    await act(async () => {});

    expect(storeActions.setAutoplayBlocked).toHaveBeenCalledWith(AUTOPLAY_BLOCKED_MESSAGE);
    expect(storeActions.setError).not.toHaveBeenCalledWith(AUTOPLAY_BLOCKED_MESSAGE);
    expect(onError).not.toHaveBeenCalled();
    expect(state.paused).toBe(true);
  });

  it("retries a blocked authoritative play with a fresh server-time target", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    const onPlaybackAction = vi.fn();
    const blocked = new DOMException("gesture required", "NotAllowedError");
    let attempt = 0;
    const { rerender } = render(
      <Harness remoteCommand={null} onPlaybackAction={onPlaybackAction} />,
    );
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(blocked) : Promise.resolve();
    });

    rerender(
      <Harness
        remoteCommand={command(21, "PLAYING", 5, "play", {
          authoritativeCurrentTime: 5,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
        onPlaybackAction={onPlaybackAction}
      />,
    );
    await act(async () => {});

    expect(storeActions.setAutoplayBlocked).toHaveBeenCalledWith(AUTOPLAY_BLOCKED_MESSAGE);
    expect(state.currentTime).toBe(5);

    vi.setSystemTime(new Date("2026-08-27T12:00:04.000Z"));
    await act(async () => {
      screen.getByRole("button", { name: "retry" }).click();
    });

    expect(video.play).toHaveBeenCalledTimes(2);
    expect(state.currentTime).toBe(9);
    expect(onPlaybackAction).not.toHaveBeenCalled();

    act(() => {
      state.paused = false;
      video.dispatchEvent(new Event("playing"));
    });

    expect(storeActions.play).toHaveBeenCalled();
    expect(storeActions.setAutoplayBlocked).toHaveBeenLastCalledWith(null);
  });

  it("does not retry a blocked play after a newer authoritative pause", async () => {
    const blocked = new DOMException("gesture required", "NotAllowedError");
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => Promise.reject(blocked));

    rerender(<Harness remoteCommand={command(30, "PLAYING", 5, "play")} />);
    await act(async () => {});
    rerender(<Harness remoteCommand={command(31, "PAUSED", 6, "pause")} />);
    await act(async () => {});

    await act(async () => {
      screen.getByRole("button", { name: "retry" }).click();
    });

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(state.paused).toBe(true);
    expect(storeActions.setPlayPending).toHaveBeenCalledWith(false);
  });

  it("invalidates blocked authoritative play when the media source changes", async () => {
    const blocked = new DOMException("gesture required", "NotAllowedError");
    const { rerender } = render(<Harness src="first.m3u8" remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => Promise.reject(blocked));

    rerender(<Harness src="first.m3u8" remoteCommand={command(32, "PLAYING", 5, "play")} />);
    await act(async () => {});
    rerender(<Harness src="second.m3u8" remoteCommand={null} />);

    await act(async () => {
      screen.getByRole("button", { name: "retry" }).click();
    });

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(storeActions.setAutoplayBlocked).toHaveBeenCalledWith(null);
  });

  it("ignores old source startup reconciliation after the media source changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    const { rerender } = render(<Harness src="first.m3u8" remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    rerender(
      <Harness
        src="first.m3u8"
        remoteCommand={command(33, "PLAYING", 5, "play", {
          authoritativeCurrentTime: 5,
          serverTime: "2026-08-27T12:00:00.000Z",
          serverClockOffsetMs: 0,
        })}
      />,
    );
    await act(async () => {});
    rerender(<Harness src="second.m3u8" remoteCommand={null} />);
    vi.clearAllMocks();

    vi.setSystemTime(new Date("2026-08-27T12:00:02.000Z"));
    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
      video.dispatchEvent(new Event("playing"));
    });

    expect(state.currentTime).toBe(5);
    expect(storeActions.setCurrentTime).not.toHaveBeenCalled();
    expect(storeActions.play).toHaveBeenCalledTimes(1);
  });

  it("prevents an old play completion from beating a newer pause", async () => {
    let resolvePlay: () => void = () => undefined;
    const playPromise = new Promise<void>((resolve) => {
      resolvePlay = resolve;
    });
    const { rerender } = render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state, () => playPromise);

    rerender(<Harness remoteCommand={command(40, "PLAYING", 10, "play")} />);
    rerender(<Harness remoteCommand={command(41, "PAUSED", 10, "pause")} />);

    await act(async () => {
      state.paused = false;
      resolvePlay();
      await playPromise;
      video.dispatchEvent(new Event("playing"));
    });

    expect(video.pause).toHaveBeenCalled();
    expect(storeActions.play).not.toHaveBeenCalled();
  });

  it("clears stale recoverable and fatal player state after successful media lifecycle events", () => {
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);
    vi.clearAllMocks();

    act(() => {
      video.dispatchEvent(new Event("loadedmetadata"));
      video.dispatchEvent(new Event("canplay"));
      video.dispatchEvent(new Event("playing"));
    });

    expect(storeActions.setError).toHaveBeenCalledWith(null);
    expect(storeActions.setAutoplayBlocked).toHaveBeenCalledWith(null);
    expect(storeActions.setBuffering).toHaveBeenCalledWith(false);
  });

  it("treats buffering as buffering, not a fatal playback error", () => {
    render(<Harness remoteCommand={null} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: false,
      ended: false,
      readyState: 1,
    };
    installVideoState(video, state);
    vi.clearAllMocks();

    act(() => {
      video.dispatchEvent(new Event("waiting"));
    });

    expect(storeActions.setBuffering).toHaveBeenCalledWith(true);
    expect(storeActions.setError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("still reports genuine media element errors as fatal playback errors", () => {
    const onError = vi.fn();
    render(<Harness remoteCommand={null} onError={onError} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    const state = {
      currentTime: 0,
      duration: 120,
      paused: true,
      ended: false,
      readyState: 1,
      error: { message: "decode failed" } as MediaError,
    };
    installVideoState(video, state);
    vi.clearAllMocks();

    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(storeActions.setError).toHaveBeenCalledWith("decode failed");
    expect(onError).toHaveBeenCalledWith("decode failed");
  });
});
