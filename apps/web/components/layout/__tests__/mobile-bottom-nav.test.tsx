import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

// Mock Next.js
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUsePathname = vi.fn(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock UI store
const mockSetSearchOpen = vi.fn();
vi.mock('@/stores/ui.store', () => ({
  useUIStore: () => ({
    setSearchOpen: mockSetSearchOpen,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Home: ({ className }: { className?: string }) => (
    <svg data-testid="icon-home" className={className} />
  ),
  Tv: ({ className }: { className?: string }) => (
    <svg data-testid="icon-tv" className={className} />
  ),
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="icon-search" className={className} />
  ),
  Smartphone: ({ className }: { className?: string }) => (
    <svg data-testid="icon-device-mobile" className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <svg data-testid="icon-user" className={className} />
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

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard');
  });

  describe('Rendering', () => {
    it('should render a nav element', () => {
      render(<MobileBottomNav />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render 5 items: Главная, Сериалы, Поиск, Шортсы, Аккаунт', () => {
      render(<MobileBottomNav />);
      expect(screen.getByText('Главная')).toBeInTheDocument();
      expect(screen.getByText('Сериалы')).toBeInTheDocument();
      expect(screen.getByText('Поиск')).toBeInTheDocument();
      expect(screen.getByText('Шортсы')).toBeInTheDocument();
      expect(screen.getByText('Аккаунт')).toBeInTheDocument();
    });

    it('should render links to /dashboard, /series, /shorts, /account', () => {
      render(<MobileBottomNav />);
      expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Сериалы' })).toHaveAttribute('href', '/series');
      expect(screen.getByRole('link', { name: 'Шортсы' })).toHaveAttribute('href', '/shorts');
      expect(screen.getByRole('link', { name: 'Аккаунт' })).toHaveAttribute('href', '/account');
    });

    it('should render search tab as a button (not link)', () => {
      render(<MobileBottomNav />);
      const searchButton = screen.getByRole('button', { name: 'Поиск' });
      expect(searchButton).toBeInTheDocument();
      expect(searchButton.tagName).toBe('BUTTON');
    });
  });

  describe('Active state', () => {
    it('should mark current route with aria-current="page"', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<MobileBottomNav />);
      expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });

    it('should not mark other routes as active', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<MobileBottomNav />);
      expect(screen.getByRole('link', { name: 'Сериалы' })).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('link', { name: 'Шортсы' })).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('link', { name: 'Аккаунт' })).not.toHaveAttribute('aria-current');
    });

    it('should activate correct link for /series path', () => {
      mockUsePathname.mockReturnValue('/series');
      render(<MobileBottomNav />);
      expect(screen.getByRole('link', { name: 'Сериалы' })).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(screen.getByRole('link', { name: 'Главная' })).not.toHaveAttribute('aria-current');
    });

    it('should activate correct link for /shorts path', () => {
      mockUsePathname.mockReturnValue('/shorts');
      render(<MobileBottomNav />);
      expect(screen.getByRole('link', { name: 'Шортсы' })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });

    it('should activate correct link for /account path', () => {
      mockUsePathname.mockReturnValue('/account');
      render(<MobileBottomNav />);
      expect(screen.getByRole('link', { name: 'Аккаунт' })).toHaveAttribute(
        'aria-current',
        'page'
      );
    });
  });

  describe('Search button', () => {
    it('should call setSearchOpen(true) on click', () => {
      render(<MobileBottomNav />);
      fireEvent.click(screen.getByRole('button', { name: 'Поиск' }));
      expect(mockSetSearchOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('Hide on watch routes', () => {
    it('should return null when pathname starts with /watch', () => {
      mockUsePathname.mockReturnValue('/watch');
      const { container } = render(<MobileBottomNav />);
      expect(container.innerHTML).toBe('');
    });

    it('should return null for /watch/123/settings', () => {
      mockUsePathname.mockReturnValue('/watch/123/settings');
      const { container } = render(<MobileBottomNav />);
      expect(container.innerHTML).toBe('');
    });

    it('should render normally on non-watch routes', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<MobileBottomNav />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render normally on /series route', () => {
      mockUsePathname.mockReturnValue('/series');
      render(<MobileBottomNav />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Touch targets', () => {
    it('should have min-w-[48px] and min-h-[48px] on all link items', () => {
      render(<MobileBottomNav />);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link.className).toContain('min-w-[48px]');
        expect(link.className).toContain('min-h-[48px]');
      });
    });

    it('should have min-w-[48px] and min-h-[48px] on search button', () => {
      render(<MobileBottomNav />);
      const searchButton = screen.getByRole('button', { name: 'Поиск' });
      expect(searchButton.className).toContain('min-w-[48px]');
      expect(searchButton.className).toContain('min-h-[48px]');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on all nav items', () => {
      render(<MobileBottomNav />);
      expect(screen.getByLabelText('Главная')).toBeInTheDocument();
      expect(screen.getByLabelText('Сериалы')).toBeInTheDocument();
      expect(screen.getByLabelText('Поиск')).toBeInTheDocument();
      expect(screen.getByLabelText('Шортсы')).toBeInTheDocument();
      expect(screen.getByLabelText('Аккаунт')).toBeInTheDocument();
    });
  });
});
