import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlayerControls } from "../player-controls";
import { PlayerOverlay } from "../player-overlay";

vi.mock("@/stores/player.store", () => ({
  usePlayerStore: () => ({
    isPlaying: false,
    isPaused: true,
    isBuffering: false,
    isEnded: false,
    error: null,
    autoplayBlockedMessage: null,
    isFullscreen: false,
    isControlsVisible: true,
    currentTime: 0,
    duration: 120,
    bufferedTime: 0,
    progress: 0,
    volume: 1,
    isMuted: false,
    quality: "auto",
    availableQualities: ["auto"],
    playbackSpeed: 1,
    isSettingsOpen: false,
    setSettingsOpen: vi.fn(),
    setPlaybackSpeed: vi.fn(),
    seekRelative: vi.fn(),
    toggleMute: vi.fn(),
    setVolume: vi.fn(),
  }),
}));

describe("mobile player controls", () => {
  it("uses compact mobile visuals while preserving desktop sizing classes", () => {
    const { container } = render(
      <PlayerControls
        onPlayPause={vi.fn()}
        onSeek={vi.fn()}
        onQualityChange={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onSkipBack={vi.fn()}
        onSkipForward={vi.fn()}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("px-2");
    expect(root.className).toContain("sm:px-4");
    expect(root.className).toContain("pb-2");
    expect(root.className).toContain("sm:pb-5");

    const playButton = container.querySelector("button") as HTMLButtonElement;
    expect(playButton.className).toContain("h-10");
    expect(playButton.className).toContain("w-10");
    expect(playButton.className).toContain("sm:p-2");
  });

  it("keeps the center overlay compact on mobile and desktop-sized above sm", () => {
    const { container } = render(<PlayerOverlay onPlayPause={vi.fn()} />);

    const playButton = container.querySelector("button") as HTMLButtonElement;
    expect(playButton.className).toContain("h-14");
    expect(playButton.className).toContain("w-14");
    expect(playButton.className).toContain("sm:h-20");
    expect(playButton.className).toContain("sm:w-20");
  });
});
