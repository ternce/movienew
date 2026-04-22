'use client';

import {
  Bell,
  Clock,
  CreditCard,
  Crown,
  SquaresFour,
  Gear,
  Shield,
  User,
} from '@phosphor-icons/react';
import { BookMarked } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/use-account';
import { useUnreadCount } from '@/hooks/use-notifications';
import { useAuthStore } from '@/stores/auth.store';

const ACCOUNT_NAV = [
  { href: '/account', icon: SquaresFour, label: 'Обзор', exact: true },
  { href: '/account/profile', icon: User, label: 'Профиль' },
  { href: '/account/watchlist', icon: BookMarked, label: 'Избранное' },
  { href: '/account/history', icon: Clock, label: 'История' },
  { href: '/account/notifications', icon: Bell, label: 'Уведомления', badge: true },
  { href: '/account/settings', icon: Gear, label: 'Настройки' },
  { href: '/account/subscriptions', icon: Crown, label: 'Подписки' },
  { href: '/account/payments', icon: CreditCard, label: 'Платежи' },
  { href: '/account/verification', icon: Shield, label: 'Верификация' },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const { data: unread } = useUnreadCount();

  const displayName = [
    profile?.firstName || user?.firstName,
    profile?.lastName || user?.lastName,
  ]
    .filter(Boolean)
    .join(' ') || 'Пользователь';

  const planName = (profile as any)?.activeSubscription?.plan?.name;

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* User info */}
        <div className="flex flex-col items-center rounded-xl border border-mp-border bg-mp-surface/50 p-5">
          <UserAvatar
            src={profile?.avatarUrl || user?.avatarUrl}
            name={displayName}
            size="xl"
          />
          <p className="mt-3 text-sm font-semibold text-mp-text-primary truncate max-w-full">
            {displayName}
          </p>
          <p className="mt-0.5 text-xs text-mp-text-secondary truncate max-w-full">
            {user?.email || ''}
          </p>
          {planName && (
            <Badge variant="default" className="mt-2 text-[10px]">
              <Crown className="mr-1 h-3 w-3" />
              {planName}
            </Badge>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {ACCOUNT_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const badgeCount = ('badge' in item && item.badge && unread?.count) ? unread.count : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-mp-accent-primary/10 text-mp-accent-primary'
                    : 'text-mp-text-secondary hover:bg-mp-surface/80 hover:text-mp-text-primary'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {badgeCount > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mp-accent-primary px-1.5 text-[10px] font-bold text-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/**
 * Mobile horizontal tabs for account navigation (shown on < lg screens)
 */
export function AccountMobileTabs() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden -mx-4 sm:-mx-6 mb-6 overflow-x-auto border-b border-mp-border">
      <div className="flex min-w-max gap-1 px-4 sm:px-6 pb-2">
        {ACCOUNT_NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-mp-accent-primary/10 text-mp-accent-primary'
                  : 'text-mp-text-secondary hover:bg-mp-surface/80 hover:text-mp-text-primary'
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
