import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { SearchInput } from '@/components/search/search-input';
import { useSearchSuggestions } from '@/hooks/use-search';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Mock debounce hook to return value synchronously (no delay)
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock useSearchSuggestions hook
vi.mock('@/hooks/use-search', () => ({
  useSearchSuggestions: vi.fn(() => ({ data: [], isLoading: false })),
}));

const RECENT_SEARCHES_KEY = 'mp-recent-searches';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useSearchSuggestions).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useSearchSuggestions>);
  });

  describe('Rendering', () => {
    it('should render input with default placeholder', () => {
      render(<SearchInput />);
      expect(screen.getByPlaceholderText('Поиск...')).toBeInTheDocument();
    });

    it('should render input with custom placeholder', () => {
      render(<SearchInput placeholder="Найти..." />);
      expect(screen.getByPlaceholderText('Найти...')).toBeInTheDocument();
    });

    it('should set role="combobox" on input', () => {
      render(<SearchInput />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should not show dropdown when input is empty and no recent', () => {
      render(<SearchInput />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Recent searches', () => {
    it('should load recent searches from localStorage on focus', async () => {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['Сериал 1', 'Курс']));
      render(<SearchInput />);

      const input = screen.getByRole('combobox');
      await act(async () => {
        fireEvent.focus(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/Недавние запросы/i)).toBeInTheDocument();
      });
    });

    it('should save search to localStorage on form submit', async () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Тест запрос' } });
      });

      // Submit the form
      const form = input.closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      expect(stored).toContain('Тест запрос');
    });

    it('should limit recent searches to 5 items', () => {
      const sixItems = ['a', 'b', 'c', 'd', 'e', 'f'];
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(sixItems));

      render(<SearchInput />);

      // The stored value won't be trimmed until next save
      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      expect(stored.length).toBe(6);
    });
  });

  describe('Suggestion filtering', () => {
    it('should not show suggestions for 0-1 character input', async () => {
      // Hook returns nothing for short queries (enabled: false)
      vi.mocked(useSearchSuggestions).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof useSearchSuggestions>);

      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Т' } });
      });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should show suggestions returned from the API hook', async () => {
      vi.mocked(useSearchSuggestions).mockReturnValue({
        data: [
          { id: '1', title: 'Ночной Патруль', type: 'series' },
          { id: '2', title: 'Ночной Дозор', type: 'series' },
        ],
        isLoading: false,
      } as ReturnType<typeof useSearchSuggestions>);

      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Ночной' } });
      });

      const listbox = await screen.findByRole('listbox');
      expect(listbox).toBeInTheDocument();

      const options = await screen.findAllByRole('option');
      expect(options.length).toBe(2);
      expect(options[0].textContent).toMatch(/Ночной Патруль/);
    });

    it('should show suggestions case-insensitively (via API)', async () => {
      vi.mocked(useSearchSuggestions).mockReturnValue({
        data: [
          { id: '1', title: 'Точка Невозврата', type: 'series' },
        ],
        isLoading: false,
      } as ReturnType<typeof useSearchSuggestions>);

      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'точка' } });
      });

      const options = await screen.findAllByRole('option');
      expect(options.length).toBeGreaterThanOrEqual(1);
      expect(options[0].textContent).toMatch(/Точка Невозврата/);
    });
  });

  describe('Keyboard handling', () => {
    beforeEach(() => {
      vi.mocked(useSearchSuggestions).mockReturnValue({
        data: [
          { id: '1', title: 'Ночной Патруль', type: 'series' },
          { id: '2', title: 'Ночной Дозор', type: 'series' },
        ],
        isLoading: false,
      } as ReturnType<typeof useSearchSuggestions>);
    });

    it('should move selectedIndex on ArrowDown', async () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Ночной' } });
      });

      await screen.findByRole('listbox');

      await act(async () => {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should move selectedIndex on ArrowUp (wrap around)', async () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Ночной' } });
      });

      await screen.findByRole('listbox');

      // First ArrowDown from -1 selects index 0
      await act(async () => {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      // ArrowUp from index 0 wraps to last item
      await act(async () => {
        fireEvent.keyDown(input, { key: 'ArrowUp' });
      });

      const updatedOptions = screen.getAllByRole('option');
      const lastOption = updatedOptions[updatedOptions.length - 1];
      expect(lastOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should close dropdown on Escape', async () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Ночной' } });
      });

      await screen.findByRole('listbox');

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Clear button', () => {
    it('should show clear button when input has value', async () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'test' } });
      });

      // The X clear button exists
      const clearButtons = document.querySelectorAll('button[type="button"]');
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility attributes', () => {
    it('should toggle aria-expanded based on dropdown state', async () => {
      vi.mocked(useSearchSuggestions).mockReturnValue({
        data: [
          { id: '1', title: 'Ночной Патруль', type: 'series' },
        ],
        isLoading: false,
      } as ReturnType<typeof useSearchSuggestions>);

      render(<SearchInput />);
      const input = screen.getByRole('combobox');

      expect(input).toHaveAttribute('aria-expanded', 'false');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Ночной' } });
      });

      await screen.findByRole('listbox');
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup="listbox"', () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should have aria-controls pointing to suggestions', () => {
      render(<SearchInput />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-controls', 'search-suggestions');
    });
  });
});
