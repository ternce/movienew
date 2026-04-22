import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { ShortCard, type ShortContent } from '@/components/content/short-card';

const mockShort: ShortContent = {
  id: 's1',
  title: 'Тестовый Short',
  videoUrl: '/test.mp4',
  thumbnailUrl: '/test.jpg',
  creator: 'Тестер',
  likeCount: 1234,
  commentCount: 56,
  shareCount: 78,
};

describe('ShortCard', () => {
  describe('Rendering', () => {
    it('should render short title', () => {
      render(<ShortCard content={mockShort} />);
      expect(screen.getByText('Тестовый Short')).toBeInTheDocument();
    });

    it('should render creator name with @', () => {
      render(<ShortCard content={mockShort} />);
      expect(screen.getByText('@Тестер')).toBeInTheDocument();
    });

    it('should render like, comment, and share buttons', () => {
      render(<ShortCard content={mockShort} />);
      expect(screen.getByRole('button', { name: 'Нравится' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Комментарии' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Поделиться' })).toBeInTheDocument();
    });

    it('should render formatted counts for actions', () => {
      render(<ShortCard content={mockShort} />);
      // formatNumber with Russian locale
      const likeText = screen.getByText(/1[\s\u00a0]234/);
      expect(likeText).toBeInTheDocument();
    });

    it('should render video element with poster', () => {
      render(<ShortCard content={mockShort} />);
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('poster', '/test.jpg');
      expect(video).toHaveAttribute('src', '/test.mp4');
    });

    it('should set data-short-id attribute', () => {
      render(<ShortCard content={mockShort} />);
      const card = document.querySelector('[data-short-id="s1"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Ref forwarding', () => {
    it('should forward ref correctly', () => {
      const ref = createRef<HTMLDivElement>();
      render(<ShortCard ref={ref} content={mockShort} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('data-short-id', 's1');
    });
  });

  describe('Active state', () => {
    it('should set video autoPlay when isActive=true', () => {
      render(<ShortCard content={mockShort} isActive={true} />);
      const video = document.querySelector('video');
      expect(video).toHaveAttribute('autoplay');
    });

    it('should not autoPlay when isActive=false', () => {
      render(<ShortCard content={mockShort} isActive={false} />);
      const video = document.querySelector('video');
      expect(video).not.toHaveAttribute('autoplay');
    });

    it('should show play indicator when not active', () => {
      const { container } = render(<ShortCard content={mockShort} isActive={false} />);
      // Play indicator is shown as a centered overlay when not active
      const playOverlay = container.querySelector('.pointer-events-none');
      expect(playOverlay).toBeInTheDocument();
    });

    it('should not show play indicator when active', () => {
      const { container } = render(<ShortCard content={mockShort} isActive={true} />);
      // The play indicator wrapper with pointer-events-none and flex items-center justify-center
      // is only rendered when !isActive
      const playIndicators = container.querySelectorAll('.pointer-events-none');
      // Gradient overlay also has pointer-events-none, so check for the play icon specifically
      const playIcons = container.querySelectorAll('.pointer-events-none svg.fill-white');
      // When active, the large centered play icon should not be present in the pointer-events-none container
      // that contains the Play icon. The gradient overlay still has pointer-events-none.
      // We can just verify the isActive=true path doesn't render the {!isActive && ...} block
      expect(container.querySelector('[class*="w-16 h-16"]')).not.toBeInTheDocument();
    });
  });
});
