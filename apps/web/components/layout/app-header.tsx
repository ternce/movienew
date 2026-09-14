'use client';

import { List, MagnifyingGlass } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { MobileHeader } from '@/components/layout/mobile-header';
import { ProfileDropdown } from '@/components/layout/profile-dropdown';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { PwaInstallAction } from '@/components/pwa/pwa-install-action';
import { SearchInputCompact } from '@/components/search/search-input';
import { CartBadge } from '@/components/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';

const CartDrawer = dynamic(
  () => import('@/components/store/cart-drawer').then((m) => m.CartDrawer),
);

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const { setMobileMenuOpen, setSearchOpen } = useUIStore();
  const [cartOpen, setCartOpen] = React.useState(false);

  return (
    <>
      <MobileHeader mode="app" />

      <header
        className={cn(
          'sticky top-0 z-30 hidden h-[68px] border-b border-white/[0.03] bg-[#090016]/50 backdrop-blur-2xl md:block',
          className,
        )}
      >
        <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 md:px-[24px]">
          <div className="flex min-w-[40px] items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Открыть меню"
              className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden w-full max-w-[500px] justify-self-start sm:block">
            <SearchInputCompact
              placeholder="Поиск видео"
              className="[&_input]:h-[28px] [&_input]:rounded-[7px] [&_input]:border-white/[0.035] [&_input]:bg-black/48 [&_input]:pl-9 [&_input]:text-[14px] [&_input]:text-white/80 [&_input]:shadow-[0_8px_28px_rgba(0,0,0,0.22)] [&_input]:placeholder:text-white/36 [&_svg]:left-3 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white/32"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Поиск"
              className="h-8 w-8 text-white/65 hover:text-white sm:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <MagnifyingGlass className="h-4 w-4" />
            </Button>

            <CartBadge
              onClick={() => setCartOpen(true)}
              className="hidden h-8 w-8 text-white/65 hover:text-white [&_svg]:h-4 [&_svg]:w-4 xl:flex"
            />
            <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
            <PwaInstallAction nativeOnly className="hidden lg:inline-flex" />
            <NotificationBell />
            <ProfileDropdown />
          </div>
        </div>
      </header>
    </>
  );
}
