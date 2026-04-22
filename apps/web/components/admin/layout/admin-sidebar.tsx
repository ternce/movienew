'use client';

import {
  SquaresFour,
  Users,
  ShieldCheck,
  FilmStrip,
  CreditCard,
  UsersThree,
  Wallet,
  Bag,
  Receipt,
  Envelope,
  FileText,
  Scroll,
  Gear,
  SignOut,
  X,
  CaretDown,
  Play,
  Money,
  ChartBar,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';

/**
 * Navigation group configuration for admin panel
 */
interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number | string;
}

/**
 * Admin navigation groups - organized by functionality
 */
const adminNavGroups: NavGroup[] = [
  {
    label: 'ОБЗОР',
    items: [
      { href: '/admin/dashboard', icon: SquaresFour, label: 'Дашборд' },
      { href: '/admin/reports', icon: ChartBar, label: 'Отчёты' },
    ],
  },
  {
    label: 'ПОЛЬЗОВАТЕЛИ',
    items: [
      { href: '/admin/users', icon: Users, label: 'Пользователи' },
      { href: '/admin/verifications', icon: ShieldCheck, label: 'Верификации' },
    ],
  },
  {
    label: 'КОНТЕНТ',
    items: [
      { href: '/admin/content', icon: FilmStrip, label: 'Библиотека контента' },
    ],
  },
  {
    label: 'ФИНАНСЫ',
    items: [
      { href: '/admin/subscriptions', icon: CreditCard, label: 'Подписки' },
      { href: '/admin/payments', icon: Money, label: 'Платежи' },
    ],
    collapsible: true,
  },
  {
    label: 'ПАРТНЁРЫ',
    items: [
      { href: '/admin/partners', icon: UsersThree, label: 'Партнёры' },
      { href: '/admin/partners/withdrawals', icon: Wallet, label: 'Выводы' },
    ],
    collapsible: true,
  },
  {
    label: 'МАГАЗИН',
    items: [
      { href: '/admin/store/products', icon: Bag, label: 'Товары' },
      { href: '/admin/store/orders', icon: Receipt, label: 'Заказы' },
    ],
    collapsible: true,
  },
  {
    label: 'КОММУНИКАЦИИ',
    items: [
      { href: '/admin/newsletters', icon: Envelope, label: 'Рассылки' },
      { href: '/admin/documents', icon: FileText, label: 'Документы' },
    ],
    collapsible: true,
  },
  {
    label: 'СИСТЕМА',
    items: [
      { href: '/admin/audit', icon: Scroll, label: 'Журнал аудита' },
      { href: '/admin/settings', icon: Gear, label: 'Настройки' },
    ],
    collapsible: true,
  },
];

/**
 * Sidebar width constants
 */
const ADMIN_SIDEBAR_WIDTH = 250;

interface AdminSidebarProps {
  className?: string;
}

/**
 * Admin panel sidebar with grouped navigation
 */
export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(
    new Set(['ПАРТНЁРЫ', 'МАГАЗИН', 'КОММУНИКАЦИИ', 'СИСТЕМА'])
  );

  /**
   * Check if a nav item is active
   */
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  /**
   * Toggle group collapse
   */
  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
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
          'fixed top-0 left-0 z-50 h-full bg-mp-bg-secondary flex flex-col transition-transform duration-300 ease-in-out border-r border-mp-border',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
          className
        )}
        style={{ width: ADMIN_SIDEBAR_WIDTH }}
      >
        {/* Logo section */}
        <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-mp-border">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2"
            onClick={handleNavClick}
          >
            <div className="w-6 h-6 rounded bg-mp-accent-primary flex items-center justify-center shrink-0">
              <Play className="w-3 h-3 text-white" weight="fill" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-mp-text-primary leading-none">
                MoviePlatform
              </span>
              <span className="text-[10px] text-mp-accent-secondary font-medium uppercase tracking-wider">
                Панель управления
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 text-mp-text-secondary hover:text-mp-text-primary rounded-md hover:bg-mp-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
          {adminNavGroups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.label);
            const hasActiveItem = group.items.some((item) => isActive(item.href));

            return (
              <div key={group.label} className="mb-2">
                {/* Group header */}
                {group.collapsible ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-1.5 mb-1',
                      'text-xs font-medium tracking-wider transition-colors',
                      hasActiveItem ? 'text-mp-text-primary' : 'text-mp-text-disabled hover:text-mp-text-secondary'
                    )}
                  >
                    <span>{group.label}</span>
                    <CaretDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform',
                        isCollapsed && '-rotate-90'
                      )}
                    />
                  </button>
                ) : (
                  <div className="px-3 py-1.5 mb-1">
                    <span className="text-xs font-medium text-mp-text-disabled tracking-wider">
                      {group.label}
                    </span>
                  </div>
                )}

                {/* Group items */}
                {(!group.collapsible || !isCollapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleNavClick}
                          className={cn(
                            'relative flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-all',
                            active
                              ? 'text-mp-accent-primary bg-mp-accent-primary/10'
                              : 'text-mp-text-secondary hover:text-mp-text-primary hover:bg-mp-surface'
                          )}
                        >
                          <item.icon className="w-4.5 h-4.5 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                'px-1.5 py-0.5 text-xs font-semibold rounded-full',
                                active
                                  ? 'bg-mp-accent-primary text-white'
                                  : 'bg-mp-surface text-mp-text-secondary'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Back to main app & Logout */}
        <div className="shrink-0 px-3 py-4 border-t border-mp-border space-y-1">
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-mp-text-secondary hover:text-mp-text-primary hover:bg-mp-surface transition-colors"
          >
            <Play className="w-4.5 h-4.5 shrink-0" />
            <span>На главную</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-mp-error-text hover:bg-mp-error-bg/50 transition-colors"
          >
            <SignOut className="w-4.5 h-4.5 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export { ADMIN_SIDEBAR_WIDTH };
