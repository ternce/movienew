import { render, screen } from '@testing-library/react';
import { ClipCard, type ClipContent } from '@/components/content/clip-card';

// Mock Next.js modules
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, ...rest } = props;
    return <img {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/components/content/age-badge', () => ({
  AgeBadge: ({ age }: { age: string }) => <span data-testid="age-badge">{age}</span>,
}));

const mockClip: ClipContent = {
  id: 'c1',
  slug: 'test-clip',
  title: 'Тестовый Клип',
  thumbnailUrl: '/test.jpg',
  duration: 185,
  viewCount: 12500,
  ageCategory: '16+',
};

describe('ClipCard', () => {
  describe('Rendering', () => {
    it('should render clip title', () => {
      render(<ClipCard content={mockClip} />);
      expect(screen.getByText('Тестовый Клип')).toBeInTheDocument();
    });

    it('should render formatted duration (3:05)', () => {
      render(<ClipCard content={mockClip} />);
      // Duration appears both in badge and in info section
      const durations = screen.getAllByText('3:05');
      expect(durations.length).toBeGreaterThanOrEqual(1);
    });

    it('should render formatted view count', () => {
      render(<ClipCard content={mockClip} />);
      // formatNumber for Russian locale
      const viewText = screen.getByText(/12/);
      expect(viewText).toBeInTheDocument();
    });

    it('should render age badge with correct category', () => {
      render(<ClipCard content={mockClip} />);
      expect(screen.getByTestId('age-badge')).toHaveTextContent('16+');
    });

    it('should render thumbnail image with correct alt text', () => {
      render(<ClipCard content={mockClip} />);
      const img = screen.getByAltText('Тестовый Клип');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test.jpg');
    });

    it('should render as a link to /watch/{id}', () => {
      render(<ClipCard content={mockClip} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/watch/c1');
    });
  });

  describe('Optional category badge', () => {
    it('should render category badge when category is provided', () => {
      const clipWithCategory = { ...mockClip, category: 'Боевик' };
      render(<ClipCard content={clipWithCategory} />);
      expect(screen.getByText('Боевик')).toBeInTheDocument();
    });

    it('should not render category badge when category is absent', () => {
      render(<ClipCard content={mockClip} />);
      expect(screen.queryByText('Боевик')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero view count', () => {
      const zeroViews = { ...mockClip, viewCount: 0 };
      render(<ClipCard content={zeroViews} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show placeholder when thumbnailUrl is empty', () => {
      const noThumb = { ...mockClip, thumbnailUrl: '' };
      render(<ClipCard content={noThumb} />);
      // Film icon placeholder should render instead of img
      expect(screen.queryByAltText('Тестовый Клип')).not.toBeInTheDocument();
    });
  });
});
