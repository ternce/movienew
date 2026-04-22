import { render, screen } from '@testing-library/react';
import { SearchResults } from '@/components/search/search-results';

// Mock child components used by SearchResults
vi.mock('@/components/ui/grid', () => ({
  ContentGrid: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="content-grid">{children}</div>
  ),
}));

vi.mock('@/components/content', () => ({
  SeriesCard: ({ content }: { content: { id: string; title: string } }) => (
    <div data-testid={`series-card-${content.id}`}>{content.title}</div>
  ),
  VideoCardSkeletonGrid: ({ count }: { count: number }) => (
    <div data-testid="skeleton-grid">Loading {count} items...</div>
  ),
}));

const mockResults = [
  {
    id: '1',
    title: 'Ночной Патруль',
    slug: 'nochnoy-patrul',
    contentType: 'SERIES' as const,
    ageCategory: '16+',
    thumbnailUrl: '/thumb1.jpg',
    description: 'Test',
    viewCount: 100,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    title: 'Точка Невозврата',
    slug: 'tochka-nevozrata',
    contentType: 'SERIES' as const,
    ageCategory: '18+',
    thumbnailUrl: '/thumb2.jpg',
    description: 'Test 2',
    viewCount: 200,
    createdAt: '2024-02-01',
  },
];

describe('SearchResults', () => {
  describe('Loading state', () => {
    it('should show skeleton grid when loading', () => {
      render(
        <SearchResults
          query="test"
          results={[]}
          isLoading={true}
          totalResults={0}
        />
      );

      expect(screen.getByTestId('skeleton-grid')).toBeInTheDocument();
    });
  });

  describe('Empty query state', () => {
    it('should show "Начните поиск" when no query', () => {
      render(
        <SearchResults
          query=""
          results={[]}
          isLoading={false}
          totalResults={0}
        />
      );

      expect(screen.getByText('Начните поиск')).toBeInTheDocument();
    });

    it('should show description text when no query', () => {
      render(
        <SearchResults
          query=""
          results={[]}
          isLoading={false}
          totalResults={0}
        />
      );

      expect(
        screen.getByText(/Введите название фильма, сериала или обучающего курса/)
      ).toBeInTheDocument();
    });
  });

  describe('No results state', () => {
    it('should show "Ничего не найдено" when query but empty results', () => {
      render(
        <SearchResults
          query="asdfghjk"
          results={[]}
          isLoading={false}
          totalResults={0}
        />
      );

      expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    });

    it('should show the query in the no results message', () => {
      render(
        <SearchResults
          query="asdfghjk"
          results={[]}
          isLoading={false}
          totalResults={0}
        />
      );

      expect(
        screen.getByText(/По запросу «asdfghjk» ничего не найдено/)
      ).toBeInTheDocument();
    });

    it('should show search tips when no results', () => {
      render(
        <SearchResults
          query="asdfghjk"
          results={[]}
          isLoading={false}
          totalResults={0}
        />
      );

      expect(screen.getByText('Проверьте правописание')).toBeInTheDocument();
    });
  });

  describe('Results state', () => {
    it('should render aria-live="polite" on results count element', () => {
      const { container } = render(
        <SearchResults
          query="Ночной"
          results={mockResults as any}
          isLoading={false}
          totalResults={2}
        />
      );

      const ariaLiveElement = container.querySelector('[aria-live="polite"]');
      expect(ariaLiveElement).toBeInTheDocument();
    });

    it('should show results count when results exist', () => {
      render(
        <SearchResults
          query="Ночной"
          results={mockResults as any}
          isLoading={false}
          totalResults={42}
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText(/результатов/)).toBeInTheDocument();
    });

    it('should show the query in the results summary', () => {
      render(
        <SearchResults
          query="Ночной"
          results={mockResults as any}
          isLoading={false}
          totalResults={2}
        />
      );

      expect(screen.getByText('Ночной')).toBeInTheDocument();
    });

    it('should render series cards for each result', () => {
      render(
        <SearchResults
          query="Ночной"
          results={mockResults as any}
          isLoading={false}
          totalResults={2}
        />
      );

      expect(screen.getByTestId('series-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('series-card-2')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SearchResults
          query="Ночной"
          results={mockResults as any}
          isLoading={false}
          totalResults={2}
          className="custom-results"
        />
      );

      expect(container.firstElementChild).toHaveClass('custom-results');
    });
  });
});
