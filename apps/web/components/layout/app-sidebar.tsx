'use client';

import {
  Play,
  House,
  Television,
  FilmStrip,
  DeviceMobile,
  BookOpen,
  ClockCounterClockwise,
  Heart,
  Gear,
  SignOut,
  X,
  Users,
  GitBranch,
  Coins,
  Wallet,
  ShareNetwork,
  User,
  ShieldCheck,
  FileText,
  Bag,
  Package,
  Plus,
  VideoCamera,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { GenreList, AddGenreDialog } from '@/components/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';

/**
 * Navigation group configuration
 */
interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/**
 * Navigation groups matching Figma design
 */
const baseNavGroups: NavGroup[] = [
  {
    label: 'МЕНЮ',
    items: [
      { href: '/dashboard', icon: House, label: 'Главная' },
      { href: '/series', icon: Television, label: 'Сериалы' },
      { href: '/clips', icon: FilmStrip, label: 'Клипы' },
      { href: '/shorts', icon: DeviceMobile, label: 'Шортсы' },
      { href: '/tutorials', icon: BookOpen, label: 'Обучение' },
    ],
  },
  {
    label: 'БИБЛИОТЕКА',
    items: [
      { href: '/account/history', icon: ClockCounterClockwise, label: 'История' },
      { href: '/account/watchlist', icon: Heart, label: 'Избранное' },
    ],
  },
  {
    label: 'МАГАЗИН',
    items: [
      { href: '/store', icon: Bag, label: 'Каталог' },
      { href: '/store/orders', icon: Package, label: 'Мои заказы' },
    ],
  },
  {
    label: 'АККАУНТ',
    items: [
      { href: '/account', icon: User, label: 'Мой аккаунт' },
      { href: '/account/verification', icon: ShieldCheck, label: 'Верификация' },
      { href: '/documents', icon: FileText, label: 'Документы' },
    ],
  },
];

const studioNavGroup: NavGroup = {
  label: 'СТУДИЯ',
  items: [
    { href: '/studio', icon: VideoCamera, label: 'Мой контент' },
    { href: '/studio/create', icon: Plus, label: 'Создать' },
  ],
};

const partnerNavGroup: NavGroup = {
  label: 'ПАРТНЁРАМ',
  items: [
    { href: '/partner', icon: Users, label: 'Дашборд' },
    { href: '/partner/referrals', icon: GitBranch, label: 'Рефералы' },
    { href: '/partner/commissions', icon: Coins, label: 'Комиссии' },
    { href: '/partner/withdrawals', icon: Wallet, label: 'Выводы' },
    { href: '/partner/invite', icon: ShareNetwork, label: 'Пригласить' },
  ],
};

/**
 * Sidebar width constants
 */
const SIDEBAR_WIDTH = 230;
const SIDEBAR_COLLAPSED_WIDTH = 0;

interface AppSidebarProps {
  className?: string;
}

/**
 * Application sidebar with grouped navigation matching Figma design
 */
export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();

  const isAdmin = user?.role === 'ADMIN';
  const navGroups = React.useMemo(() => {
    const groups = [...baseNavGroups];
    if (isAdmin) groups.push(studioNavGroup);
    groups.push(partnerNavGroup);
    return groups;
  }, [isAdmin]);

  // State for add genre dialog
  const [isAddGenreDialogOpen, setAddGenreDialogOpen] = React.useState(false);

  /**
   * Check if a nav item is active
   */
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  /**
   * Handle navigation click - close mobile menu (no-op on desktop)
   */
  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-mp-bg-secondary flex flex-col transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
          className
        )}
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Logo section */}
        <div className="h-16 flex items-center justify-between px-5 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={handleNavClick}
          >
            <div className="w-6 h-6 rounded bg-mp-accent-primary flex items-center justify-center shrink-0">
              <Play className="w-3 h-3 text-white" weight="fill" />
            </div>
            <span className="text-lg font-semibold text-mp-text-primary tracking-tight">
              Movie<span className="text-gradient">Platform</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-mp-text-secondary hover:text-mp-text-primary rounded-md hover:bg-mp-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              <div className="px-3 mb-2">
                <span className="text-xs font-medium text-mp-text-secondary tracking-wider">
                  {group.label}
                </span>
              </div>

              {/* Group items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        active
                          ? 'text-mp-accent-primary sidebar-item-active'
                          : 'text-mp-text-secondary hover:text-mp-text-primary hover:bg-mp-surface'
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Your Genres section - now using real data */}
          <GenreList
            onNavigate={handleNavClick}
            onAddGenreClick={() => setAddGenreDialogOpen(true)}
          />
        </nav>

        {/* Bottom section - Settings & Logout */}
        <div className="shrink-0 px-3 py-4 border-t border-mp-border space-y-1">
          <Link
            href="/account/settings"
            onClick={handleNavClick}
            className={cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive('/account/settings')
                ? 'text-mp-accent-primary sidebar-item-active'
                : 'text-mp-text-secondary hover:text-mp-text-primary hover:bg-mp-surface'
            )}
          >
            <Gear className="w-5 h-5 shrink-0" />
            <span>Настройки</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-mp-error-text hover:bg-mp-error-bg/50 transition-colors"
          >
            <SignOut className="w-5 h-5 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Add genre dialog */}
      <AddGenreDialog
        open={isAddGenreDialogOpen}
        onOpenChange={setAddGenreDialogOpen}
      />
    </>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };
