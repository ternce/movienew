import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  usePlayer,
  type PlaybackLocalAction,
  type PlaybackRemoteCommand,
} from "../use-player";

const storeActions = vi.hoisted(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  setCurrentTime: vi.fn(),
  setDuration: vi.fn(),
  setBufferedTime: vi.fn(),
  setBuffering: vi.fn(),
  setEnded: vi.fn(),
  setError: vi.fn(),
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
  Object.defineProperty(video, "readyState", {
    configurable: true,
    get: () => state.readyState,
  });
  Object.defineProperty(video, "canPlayType", {
    configurable: true,
    value: () => "probably",
  });
  Object.defineProperty(video, "play", {
    configurable: true,
    value: vi.fn(() => {
      state.paused = false;
      state.ended = false;
      return playImpl?.() ?? Promise.resolve();
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
): PlaybackRemoteCommand {
  return {
    id: `${sequence}:${type}`,
    type,
    playbackStatus,
    currentTime,
    playbackRate: 1,
  };
}

function Harness({
  remoteCommand,
  onPlaybackAction,
}: {
  remoteCommand?: PlaybackRemoteCommand | null;
  onPlaybackAction?: (action: PlaybackLocalAction) => void;
}) {
  const { videoRef, togglePlayPause, seek } = usePlayer({
    src: "test.m3u8",
    remoteCommand,
    onPlaybackAction,
  });

  return (
    <>
      <video ref={videoRef} data-testid="video" />
      <button type="button" onClick={togglePlayPause}>
        toggle
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
    expect(video.play).not.toHaveBeenCalled();

    act(() => {
      state.readyState = 1;
      state.duration = 120;
      video.dispatchEvent(new Event("loadedmetadata"));
    });
    await act(async () => {});

    expect(state.currentTime).toBe(18);
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
});
