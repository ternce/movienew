'use client';

import { House, Television, MagnifyingGlass, DeviceMobile, User } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';

const NAV_ITEMS = [
  { href: '/dashboard', icon: House, label: 'Главная' },
  { href: '/series', icon: Television, label: 'Сериалы' },
  { href: '#search', icon: MagnifyingGlass, label: 'Поиск' },
  { href: '/shorts', icon: DeviceMobile, label: 'Шортсы' },
  { href: '/account', icon: User, label: 'Аккаунт' },
] as const;

/**
 * Bottom navigation bar for mobile devices
 * Hidden on md+ breakpoints and on /watch/* routes (immersive player)
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { setSearchOpen } = useUIStore();

  // Hide on watch routes for immersive video experience
  if (pathname.startsWith('/watch')) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-mp-bg-secondary/95 backdrop-blur-xl border-t border-mp-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isSearch = item.href === '#search';
          const isActive = !isSearch && pathname === item.href;

          if (isSearch) {
            return (
              <button
                key={item.href}
                onClick={() => setSearchOpen(true)}
                className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] text-mp-text-secondary active:text-mp-accent-primary transition-colors"
                aria-label={item.label}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] transition-colors',
                isActive
                  ? 'text-mp-accent-primary'
                  : 'text-mp-text-secondary active:text-mp-text-primary'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5" weight={isActive ? 'fill' : 'regular'} />
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
