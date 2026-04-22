'use client';

import { MagnifyingGlass, List } from '@phosphor-icons/react';
import * as React from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ProfileDropdown } from '@/components/layout/profile-dropdown';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { CartBadge } from '@/components/store';

const CartDrawer = dynamic(
  () => import('@/components/store/cart-drawer').then((m) => m.CartDrawer),
);
import { SearchInputCompact } from '@/components/search/search-input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Главная' },
  { href: '/series', label: 'Сериалы' },
  { href: '/clips', label: 'Клипы' },
  { href: '/shorts', label: 'Шортсы' },
  { href: '/tutorials', label: 'Обучение' },
];

interface AppHeaderProps {
  className?: string;
}

/**
 * Application header with content type tabs matching Figma design
 */
export function AppHeader({ className }: AppHeaderProps) {
  const { setMobileMenuOpen, setSearchOpen } = useUIStore();
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = React.useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 bg-mp-bg-primary/90 backdrop-blur-xl border-b border-mp-border',
        className
      )}
    >
      <div className="h-full flex items-center justify-between px-4 md:px-6 gap-4">
        {/* Left section - Mobile menu + Content type tabs */}
        <div className="flex items-center gap-6">
          {/* Mobile menu button - hidden on desktop via CSS */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Открыть меню"
            className="md:hidden p-2 text-mp-text-secondary hover:text-mp-text-primary rounded-lg hover:bg-mp-surface transition-colors"
          >
            <List className="w-5 h-5" />
          </button>

          {/* Navigation tabs - hidden on mobile */}
          <nav aria-label="Основная навигация" className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'text-mp-accent-primary'
                    : 'text-mp-text-secondary hover:text-mp-text-primary'
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Center section - Search bar */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <SearchInputCompact placeholder="Поиск сериалов, клипов..." />
        </div>

        {/* Right section - Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Поиск"
            className="sm:hidden text-mp-text-secondary hover:text-mp-text-primary"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlass className="w-5 h-5" />
          </Button>

          {/* Cart */}
          <CartBadge onClick={() => setCartOpen(true)} />
          <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

          {/* Notifications */}
          <NotificationBell />

          {/* User profile dropdown */}
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
