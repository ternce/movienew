import { render, screen, fireEvent, act } from '@testing-library/react';
import { VideoPlayer } from '@/components/player/video-player';

// Mock use-player hook
const mockTogglePlayPause = vi.fn();
const mockSeek = vi.fn();
const mockChangeQuality = vi.fn();
const mockToggleFullscreen = vi.fn();
const mockEnterPiP = vi.fn();
const mockShowControls = vi.fn();
const mockVideoRef = { current: document.createElement('video') };

vi.mock('@/components/player/use-player', () => ({
  usePlayer: () => ({
    videoRef: mockVideoRef,
    togglePlayPause: mockTogglePlayPause,
    seek: mockSeek,
    changeQuality: mockChangeQuality,
    toggleFullscreen: mockToggleFullscreen,
    enterPiP: mockEnterPiP,
    showControls: mockShowControls,
  }),
}));

// Mock player store
let mockIsControlsVisible = true;
const mockSetSettingsOpen = vi.fn();
const mockUpdateActivity = vi.fn();
const mockReset = vi.fn();
let mockCurrentTime = 30;

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: Object.assign(
    () => ({
      isControlsVisible: mockIsControlsVisible,
      setSettingsOpen: mockSetSettingsOpen,
      updateActivity: mockUpdateActivity,
      reset: mockReset,
    }),
    {
      getState: () => ({
        currentTime: mockCurrentTime,
      }),
    }
  ),
}));

// Mock player-controls
vi.mock('@/components/player/player-controls', () => ({
  PlayerControls: (props: any) => <div data-testid="player-controls" data-controls />,
  PlayerTopBar: (props: any) => <div data-testid="player-top-bar" data-controls />,
}));

// Mock player-overlay
vi.mock('@/components/player/player-overlay', () => ({
  PlayerOverlay: (props: any) => <div data-testid="player-overlay" />,
  PlayerGradientOverlay: (props: any) => <div data-testid="player-gradient-overlay" />,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) =>
    args
      .flat()
      .filter(Boolean)
      .join(' '),
}));

describe('VideoPlayer touch gestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIsControlsVisible = true;
    mockCurrentTime = 30;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to simulate a double-tap on the video player container
   */
  function doubleTap(container: HTMLElement, clientX: number) {
    const playerContainer = container.querySelector('[data-player-container]');
    expect(playerContainer).toBeTruthy();

    // First tap
    fireEvent.touchEnd(playerContainer!, {
      changedTouches: [{ clientX }],
    });

    // Advance time within double-tap threshold (< 300ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Mock getBoundingClientRect for the container
    Object.defineProperty(playerContainer!, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 300, top: 0, height: 200, right: 300, bottom: 200 }),
      configurable: true,
    });

    // Second tap at same position
    fireEvent.touchEnd(playerContainer!, {
      changedTouches: [{ clientX }],
    });
  }

  describe('Double-tap seek', () => {
    it('should seek -10s on left third double-tap', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      doubleTap(container, 50); // left third (0–100 of 300)
      expect(mockSeek).toHaveBeenCalledWith(20); // 30 - 10
    });

    it('should seek +10s on right third double-tap', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      doubleTap(container, 250); // right third (200–300 of 300)
      expect(mockSeek).toHaveBeenCalledWith(40); // 30 + 10
    });

    it('should not seek on center third double-tap', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      doubleTap(container, 150); // center third (100–200 of 300)
      expect(mockSeek).not.toHaveBeenCalled();
    });

    it('should not trigger when taps >300ms apart', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      const playerContainer = container.querySelector('[data-player-container]');

      // First tap
      fireEvent.touchEnd(playerContainer!, {
        changedTouches: [{ clientX: 50 }],
      });

      // Wait longer than 300ms
      act(() => {
        vi.advanceTimersByTime(400);
      });

      Object.defineProperty(playerContainer!, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 300, top: 0, height: 200, right: 300, bottom: 200 }),
        configurable: true,
      });

      // Second tap
      fireEvent.touchEnd(playerContainer!, {
        changedTouches: [{ clientX: 50 }],
      });

      expect(mockSeek).not.toHaveBeenCalled();
    });

    it('should not trigger when taps >50px apart horizontally', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      const playerContainer = container.querySelector('[data-player-container]');

      // First tap at x=50
      fireEvent.touchEnd(playerContainer!, {
        changedTouches: [{ clientX: 50 }],
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      Object.defineProperty(playerContainer!, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 300, top: 0, height: 200, right: 300, bottom: 200 }),
        configurable: true,
      });

      // Second tap at x=110 (60px away - more than 50px)
      fireEvent.touchEnd(playerContainer!, {
        changedTouches: [{ clientX: 110 }],
      });

      expect(mockSeek).not.toHaveBeenCalled();
    });

    it('should show -10s feedback overlay on left double-tap', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      doubleTap(container, 50);
      expect(screen.getByText('-10s')).toBeInTheDocument();
    });

    it('should show +10s feedback overlay on right double-tap', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      doubleTap(container, 250);
      expect(screen.getByText('+10s')).toBeInTheDocument();
    });

    it('should hide feedback after 600ms', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      doubleTap(container, 250);
      expect(screen.getByText('+10s')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.queryByText('+10s')).not.toBeInTheDocument();
    });

    it('should not trigger on controls (data-controls)', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      const controls = container.querySelector('[data-controls]');
      expect(controls).toBeTruthy();

      // Tap on controls element
      fireEvent.touchEnd(controls!, {
        changedTouches: [{ clientX: 50 }],
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      fireEvent.touchEnd(controls!, {
        changedTouches: [{ clientX: 50 }],
      });

      expect(mockSeek).not.toHaveBeenCalled();
    });
  });

  describe('Container attributes', () => {
    it('should have touch-manipulation class', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      const playerContainer = container.querySelector('[data-player-container]');
      expect(playerContainer?.className).toContain('touch-manipulation');
    });

    it('should have select-none class', () => {
      const { container } = render(<VideoPlayer src="test.m3u8" />);
      const playerContainer = container.querySelector('[data-player-container]');
      expect(playerContainer?.className).toContain('select-none');
    });
  });
});
