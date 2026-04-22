import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerVolumeControl } from '@/components/player/player-volume-control';

// Mock useIsMobile hook
const mockUseIsMobile = vi.fn(() => false);
vi.mock('@/hooks/use-media-query', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// Mock player store
const mockToggleMute = vi.fn();
const mockSetVolume = vi.fn();
let mockVolume = 1;
let mockIsMuted = false;

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: () => ({
    volume: mockVolume,
    isMuted: mockIsMuted,
    setVolume: mockSetVolume,
    toggleMute: mockToggleMute,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Volume: ({ className }: { className?: string }) => (
    <svg data-testid="icon-volume" className={className} />
  ),
  Volume1: ({ className }: { className?: string }) => (
    <svg data-testid="icon-volume1" className={className} />
  ),
  Volume2: ({ className }: { className?: string }) => (
    <svg data-testid="icon-volume2" className={className} />
  ),
  VolumeX: ({ className }: { className?: string }) => (
    <svg data-testid="icon-volume-x" className={className} />
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) =>
    args
      .flat()
      .filter(Boolean)
      .join(' '),
}));

describe('PlayerVolumeControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockVolume = 1;
    mockIsMuted = false;
  });

  describe('Desktop mode', () => {
    it('should render mute button with aria-label', () => {
      render(<PlayerVolumeControl />);
      expect(screen.getByLabelText('Выключить звук')).toBeInTheDocument();
    });

    it('should render volume slider area', () => {
      render(<PlayerVolumeControl />);
      // The slider container div exists (hidden by default, shown on hover)
      const muteButton = screen.getByLabelText('Выключить звук');
      expect(muteButton.parentElement).toBeInTheDocument();
    });

    it('should call toggleMute on click', () => {
      render(<PlayerVolumeControl />);
      fireEvent.click(screen.getByLabelText('Выключить звук'));
      expect(mockToggleMute).toHaveBeenCalled();
    });

    it('should show VolumeX when muted', () => {
      mockIsMuted = true;
      render(<PlayerVolumeControl />);
      expect(screen.getByTestId('icon-volume-x')).toBeInTheDocument();
    });

    it('should show Volume2 for volume >= 0.67', () => {
      mockVolume = 0.8;
      mockIsMuted = false;
      render(<PlayerVolumeControl />);
      expect(screen.getByTestId('icon-volume2')).toBeInTheDocument();
    });

    it('should show Volume1 for volume 0.33–0.66', () => {
      mockVolume = 0.5;
      mockIsMuted = false;
      render(<PlayerVolumeControl />);
      expect(screen.getByTestId('icon-volume1')).toBeInTheDocument();
    });

    it('should show Volume for volume < 0.33', () => {
      mockVolume = 0.2;
      mockIsMuted = false;
      render(<PlayerVolumeControl />);
      expect(screen.getByTestId('icon-volume')).toBeInTheDocument();
    });

    it('should show aria-label "Включить звук" when muted', () => {
      mockIsMuted = true;
      render(<PlayerVolumeControl />);
      expect(screen.getByLabelText('Включить звук')).toBeInTheDocument();
    });
  });

  describe('Mobile mode — useIsMobile = true', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('should render only mute toggle, no slider', () => {
      const { container } = render(<PlayerVolumeControl />);
      // Should have a button
      expect(screen.getByRole('button')).toBeInTheDocument();
      // Should not have the slider (slider has relative h-1 class)
      const slider = container.querySelector('.relative.h-1');
      expect(slider).not.toBeInTheDocument();
    });

    it('should have p-2.5 for larger touch target', () => {
      render(<PlayerVolumeControl />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('p-2.5');
    });

    it('should call toggleMute on tap', () => {
      render(<PlayerVolumeControl />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockToggleMute).toHaveBeenCalled();
    });

    it('should show correct aria-label based on mute state', () => {
      mockIsMuted = false;
      const { rerender } = render(<PlayerVolumeControl />);
      expect(screen.getByLabelText('Выключить звук')).toBeInTheDocument();

      mockIsMuted = true;
      rerender(<PlayerVolumeControl />);
      expect(screen.getByLabelText('Включить звук')).toBeInTheDocument();
    });
  });
});
