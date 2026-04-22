import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MobileSearchOverlay } from '@/components/search/mobile-search-overlay';

// Mock UI store
const mockSetSearchOpen = vi.fn();
const mockSetSearchQuery = vi.fn();
let mockIsOpen = true;
let mockSearchQuery = '';

vi.mock('@/stores/ui.store', () => ({
  useUIStore: () => ({
    setSearchOpen: mockSetSearchOpen,
    searchQuery: mockSearchQuery,
    setSearchQuery: (q: string) => {
      mockSearchQuery = q;
      mockSetSearchQuery(q);
    },
  }),
  useIsSearchOpen: () => mockIsOpen,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="icon-search" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="icon-x" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="icon-clock" className={className} />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <svg data-testid="icon-arrow-right" className={className} />
  ),
}));

const RECENT_SEARCHES_KEY = 'mp-recent-searches';

describe('MobileSearchOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsOpen = true;
    mockSearchQuery = '';
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  describe('Visibility', () => {
    it('should return null when isOpen is false', () => {
      mockIsOpen = false;
      const { container } = render(<MobileSearchOverlay />);
      expect(container.innerHTML).toBe('');
    });

    it('should render overlay when isOpen is true', () => {
      mockIsOpen = true;
      render(<MobileSearchOverlay />);
      expect(screen.getByPlaceholderText('Поиск сериалов, клипов...')).toBeInTheDocument();
    });
  });

  describe('Input behavior', () => {
    it('should render input with placeholder "Поиск сериалов, клипов..."', () => {
      render(<MobileSearchOverlay />);
      expect(screen.getByPlaceholderText('Поиск сериалов, клипов...')).toBeInTheDocument();
    });

    it('should have enterKeyHint="search"', () => {
      render(<MobileSearchOverlay />);
      const input = screen.getByPlaceholderText('Поиск сериалов, клипов...');
      expect(input).toHaveAttribute('enterKeyHint', 'search');
    });

    it('should have autoComplete="off"', () => {
      render(<MobileSearchOverlay />);
      const input = screen.getByPlaceholderText('Поиск сериалов, клипов...');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });
  });

  describe('Close button', () => {
    it('should render with aria-label="Закрыть поиск"', () => {
      render(<MobileSearchOverlay />);
      expect(screen.getByLabelText('Закрыть поиск')).toBeInTheDocument();
    });

    it('should call setSearchOpen(false) and setSearchQuery("") on click', () => {
      render(<MobileSearchOverlay />);
      fireEvent.click(screen.getByLabelText('Закрыть поиск'));
      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
      expect(mockSetSearchOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('Recent searches', () => {
    it('should display from localStorage when no query', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Сериал 1', 'Фильм 2']));
      mockSearchQuery = '';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      await waitFor(() => {
        expect(screen.getByText('Сериал 1')).toBeInTheDocument();
        expect(screen.getByText('Фильм 2')).toBeInTheDocument();
      });
    });

    it('should render "Очистить" button', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Тест']));
      mockSearchQuery = '';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      await waitFor(() => {
        expect(screen.getByText('Очистить')).toBeInTheDocument();
      });
    });

    it('should clear recent searches and localStorage on clear click', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Запрос 1', 'Запрос 2']));
      mockSearchQuery = '';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      await waitFor(() => {
        expect(screen.getByText('Очистить')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Очистить'));
      });

      expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
      expect(screen.queryByText('Запрос 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Запрос 2')).not.toBeInTheDocument();
    });

    it('should not show recent searches when searchQuery has a value', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Тест']));
      mockSearchQuery = 'active query';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      expect(screen.queryByText('Недавние запросы')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show message when no recent and no query', () => {
      mockSearchQuery = '';
      render(<MobileSearchOverlay />);
      expect(
        screen.getByText('Начните вводить для поиска сериалов, клипов и обучающих материалов')
      ).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('should not navigate when query is empty/whitespace', () => {
      mockSearchQuery = '   ';
      render(<MobileSearchOverlay />);
      const form = screen.getByPlaceholderText('Поиск сериалов, клипов...').closest('form')!;
      fireEvent.submit(form);
      expect(window.location.href).toBe('');
    });

    it('should save query to recent searches on submit', async () => {
      mockSearchQuery = 'Новый фильм';
      render(<MobileSearchOverlay />);
      const form = screen.getByPlaceholderText('Поиск сериалов, клипов...').closest('form')!;

      await act(async () => {
        fireEvent.submit(form);
      });

      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      expect(stored).toContain('Новый фильм');
    });

    it('should limit recent searches to 8 items', async () => {
      const existing = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(existing));
      mockSearchQuery = 'new search';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      const form = screen.getByPlaceholderText('Поиск сериалов, клипов...').closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      expect(stored.length).toBeLessThanOrEqual(8);
      expect(stored[0]).toBe('new search');
    });

    it('should deduplicate recent searches', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['existing query', 'other']));
      mockSearchQuery = 'existing query';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      const form = screen.getByPlaceholderText('Поиск сериалов, клипов...').closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      const occurrences = stored.filter((s: string) => s === 'existing query');
      expect(occurrences.length).toBe(1);
      expect(stored[0]).toBe('existing query'); // moved to front
    });
  });

  describe('Recent search click', () => {
    it('should call setSearchOpen(false) and navigate', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Запрос клик']));
      mockSearchQuery = '';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      await waitFor(() => {
        expect(screen.getByText('Запрос клик')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Запрос клик'));
      });

      expect(mockSetSearchOpen).toHaveBeenCalledWith(false);
      expect(window.location.href).toContain('/search?q=');
    });
  });

  describe('Accessibility', () => {
    it('should have min-h-[44px] on close button', () => {
      render(<MobileSearchOverlay />);
      const closeButton = screen.getByLabelText('Закрыть поиск');
      expect(closeButton.className).toContain('min-h-[44px]');
    });

    it('should have min-h-[44px] on each recent search item', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Тест 1', 'Тест 2']));
      mockSearchQuery = '';

      await act(async () => {
        render(<MobileSearchOverlay />);
      });

      await waitFor(() => {
        expect(screen.getByText('Тест 1')).toBeInTheDocument();
      });

      // Recent search items are buttons containing the text
      const recentButtons = screen.getByText('Тест 1').closest('button');
      expect(recentButtons?.className).toContain('min-h-[44px]');
    });
  });
});
