'use client';

import { List, Bell, MagnifyingGlass, User } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';

interface AdminHeaderProps {
  className?: string;
}

/**
 * Admin panel header with search, notifications, and user menu
 */
export function AdminHeader({ className }: AdminHeaderProps) {
  const { logout } = useAuth();
  const { setMobileMenuOpen } = useUIStore();
  const user = useAuthStore((state) => state.user);

  const userInitials = React.useMemo(() => {
    if (!user) return 'A';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'A';
  }, [user]);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-40 h-16 bg-mp-bg-secondary/80 backdrop-blur-xl border-b border-mp-border flex items-center justify-between px-4 md:px-6 left-0 md:left-[250px]',
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button - hidden on desktop via CSS */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 text-mp-text-secondary hover:text-mp-text-primary rounded-lg hover:bg-mp-surface transition-colors"
        >
          <List className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-text-disabled" />
          <input
            type="text"
            placeholder="Поиск пользователей, контента, заказов..."
            className="w-64 lg:w-80 h-9 pl-9 pr-4 bg-mp-surface border border-mp-border rounded-lg text-sm text-mp-text-primary placeholder:text-mp-text-disabled focus:outline-none focus:ring-2 focus:ring-mp-accent-primary/50 focus:border-mp-accent-primary transition-all"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Mobile search button */}
        <button
          className="sm:hidden p-2.5 text-mp-text-secondary hover:text-mp-text-primary rounded-lg hover:bg-mp-surface transition-colors"
          onClick={() => {
            // TODO: Implement admin search overlay
          }}
        >
          <MagnifyingGlass className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2.5 md:p-2 text-mp-text-secondary hover:text-mp-text-primary rounded-lg hover:bg-mp-surface transition-colors">
              <Bell className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-mp-accent-tertiary rounded-full" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Уведомления</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-4 px-3 text-center text-sm text-mp-text-secondary">
              Нет новых уведомлений
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-mp-surface transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-mp-accent-primary text-white text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-mp-text-primary leading-none">
                  {user?.firstName || 'Админ'}
                </span>
                <span className="text-xs text-mp-text-secondary">
                  {user?.role || 'ADMIN'}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-mp-text-primary">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-mp-text-secondary font-normal">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Настройки профиля
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-mp-error-text focus:text-mp-error-text cursor-pointer"
            >
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
