import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerProgressBar } from '@/components/player/player-progress-bar';

// Mock player store
let mockCurrentTime = 0;
let mockDuration = 0;
let mockBufferedTime = 0;
let mockProgress = 0;

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: () => ({
    currentTime: mockCurrentTime,
    duration: mockDuration,
    bufferedTime: mockBufferedTime,
    progress: mockProgress,
  }),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) =>
    args
      .flat()
      .filter(Boolean)
      .join(' '),
}));

describe('PlayerProgressBar', () => {
  const mockOnSeek = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentTime = 0;
    mockDuration = 0;
    mockBufferedTime = 0;
    mockProgress = 0;
  });

  describe('Time display', () => {
    it('should render current time as M:SS (65s → "1:05")', () => {
      mockCurrentTime = 65;
      mockDuration = 120;
      render(<PlayerProgressBar onSeek={mockOnSeek} />);
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should render duration as H:MM:SS (3600s → "1:00:00")', () => {
      mockCurrentTime = 0;
      mockDuration = 3600;
      render(<PlayerProgressBar onSeek={mockOnSeek} />);
      expect(screen.getByText('1:00:00')).toBeInTheDocument();
    });

    it('should render "0:00" for zero time', () => {
      mockCurrentTime = 0;
      mockDuration = 0;
      render(<PlayerProgressBar onSeek={mockOnSeek} />);
      const timeElements = screen.getAllByText('0:00');
      expect(timeElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render minutes with seconds padded (5s → "0:05")', () => {
      mockCurrentTime = 5;
      mockDuration = 60;
      render(<PlayerProgressBar onSeek={mockOnSeek} />);
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });

    it('should render hours with padded minutes and seconds (3661s → "1:01:01")', () => {
      mockCurrentTime = 0;
      mockDuration = 3661;
      render(<PlayerProgressBar onSeek={mockOnSeek} />);
      expect(screen.getByText('1:01:01')).toBeInTheDocument();
    });
  });

  describe('Progress bar', () => {
    it('should have min-h-[44px] for touch targets', () => {
      mockDuration = 100;
      const { container } = render(<PlayerProgressBar onSeek={mockOnSeek} />);
      const progressContainer = container.querySelector('.min-h-\\[44px\\]');
      expect(progressContainer).toBeInTheDocument();
    });

    it('should have touch-none class', () => {
      mockDuration = 100;
      const { container } = render(<PlayerProgressBar onSeek={mockOnSeek} />);
      const touchNone = container.querySelector('.touch-none');
      expect(touchNone).toBeInTheDocument();
    });

    it('should render buffered and progress indicators', () => {
      mockDuration = 100;
      mockBufferedTime = 50;
      mockProgress = 25;
      const { container } = render(<PlayerProgressBar onSeek={mockOnSeek} />);
      // Buffered indicator
      const buffered = container.querySelector('[style*="width: 50%"]');
      expect(buffered).toBeInTheDocument();
      // Progress indicator
      const progress = container.querySelector('[style*="width: 25%"]');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('Touch interaction', () => {
    it('should call onSeek on touchstart', () => {
      mockDuration = 100;
      const { container } = render(<PlayerProgressBar onSeek={mockOnSeek} />);
      const progressBar = container.querySelector('.touch-none');
      expect(progressBar).toBeInTheDocument();

      // Simulate touchstart with getBoundingClientRect mock
      Object.defineProperty(progressBar!, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 200, top: 0, height: 44, right: 200, bottom: 44 }),
      });

      fireEvent.touchStart(progressBar!, {
        touches: [{ clientX: 100 }],
      });

      expect(mockOnSeek).toHaveBeenCalled();
    });
  });

  describe('Click interaction', () => {
    it('should call onSeek on click', () => {
      mockDuration = 100;
      const { container } = render(<PlayerProgressBar onSeek={mockOnSeek} />);
      const progressBar = container.querySelector('.touch-none');
      expect(progressBar).toBeInTheDocument();

      Object.defineProperty(progressBar!, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 200, top: 0, height: 44, right: 200, bottom: 44 }),
      });

      fireEvent.click(progressBar!, { clientX: 50 });

      expect(mockOnSeek).toHaveBeenCalled();
    });
  });

  describe('Scrubber handle', () => {
    it('should have touch:opacity-100 for always-visible on touch', () => {
      mockDuration = 100;
      mockProgress = 50;
      const { container } = render(<PlayerProgressBar onSeek={mockOnSeek} />);
      const scrubber = container.querySelector('.touch\\:opacity-100');
      expect(scrubber).toBeInTheDocument();
    });
  });
});
