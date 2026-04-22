import { render, screen } from '@testing-library/react';
import { AppHeader } from '@/components/layout/app-header';

// Mock Next.js
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock hooks and stores
const mockSetMobileMenuOpen = vi.fn();

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    user: { firstName: 'Test', lastName: 'User', email: 'test@example.com', avatarUrl: null },
  })),
}));

vi.mock('@/stores/ui.store', () => ({
  useUIStore: vi.fn(() => ({
    setMobileMenuOpen: mockSetMobileMenuOpen,
    setSearchOpen: vi.fn(),
  })),
}));

// Mock SearchInputCompact
vi.mock('@/components/search/search-input', () => ({
  SearchInputCompact: ({ placeholder }: { placeholder?: string }) => (
    <form data-testid="search-input-compact">
      <input placeholder={placeholder || 'Поиск...'} />
    </form>
  ),
}));

// Mock UserAvatar
vi.mock('@/components/ui/avatar', () => ({
  UserAvatar: ({ name }: { name: string; src?: string; size?: string }) => (
    <div data-testid="user-avatar">{name}</div>
  ),
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, 'aria-label': ariaLabel, ...props }: any) => (
    <button aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => <svg data-testid="search-icon" className={className} />,
  Bell: ({ className }: { className?: string }) => <svg data-testid="bell-icon" className={className} />,
  ChevronDown: ({ className }: { className?: string }) => <svg data-testid="chevron-icon" className={className} />,
  Menu: ({ className }: { className?: string }) => <svg data-testid="menu-icon" className={className} />,
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header element', () => {
      render(<AppHeader />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render SearchInputCompact component', () => {
      render(<AppHeader />);
      expect(screen.getByTestId('search-input-compact')).toBeInTheDocument();
    });

    it('should render user avatar', () => {
      render(<AppHeader />);
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    });
  });

  describe('ARIA labels', () => {
    it('should render mobile search button with aria-label="Поиск"', () => {
      render(<AppHeader />);
      expect(screen.getByLabelText('Поиск')).toBeInTheDocument();
    });

    it('should render notifications button with aria-label="Уведомления"', () => {
      render(<AppHeader />);
      expect(screen.getByLabelText('Уведомления')).toBeInTheDocument();
    });

    it('should always render mobile menu button in DOM (CSS-hidden on desktop)', () => {
      render(<AppHeader />);
      const menuButton = screen.getByLabelText('Открыть меню');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton.className).toContain('md:hidden');
    });
  });

  describe('Navigation tabs', () => {
    it('should render all navigation tabs', () => {
      render(<AppHeader />);
      expect(screen.getByText('Главная')).toBeInTheDocument();
      expect(screen.getByText('Сериалы')).toBeInTheDocument();
      expect(screen.getByText('Клипы')).toBeInTheDocument();
      expect(screen.getByText('Шортсы')).toBeInTheDocument();
      expect(screen.getByText('Обучение')).toBeInTheDocument();
    });

    it('should render tabs as links with correct hrefs', () => {
      render(<AppHeader />);
      expect(screen.getByText('Главная').closest('a')).toHaveAttribute('href', '/dashboard');
      expect(screen.getByText('Сериалы').closest('a')).toHaveAttribute('href', '/series');
      expect(screen.getByText('Клипы').closest('a')).toHaveAttribute('href', '/clips');
      expect(screen.getByText('Шортсы').closest('a')).toHaveAttribute('href', '/shorts');
      expect(screen.getByText('Обучение').closest('a')).toHaveAttribute('href', '/tutorials');
    });

    it('should mark active tab with aria-current="page"', () => {
      render(<AppHeader />);
      // usePathname returns '/dashboard', so Главная should be active
      expect(screen.getByText('Главная').closest('a')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText('Сериалы').closest('a')).not.toHaveAttribute('aria-current');
    });
  });
});
