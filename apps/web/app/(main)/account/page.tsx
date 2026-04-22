'use client';

import {
  ArrowRight,
  BookmarkSimple,
  Clock,
  CreditCard,
  Crown,
  FilmStrip,
  Gift,
  Play,
  Gear,
  Shield,
  User,
  Users,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { ContentImage } from '@/components/content/content-image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/avatar';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useProfile, useVerificationStatus, useContinueWatching } from '@/hooks/use-account';
import { useActiveSubscription } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { formatDuration } from '@/lib/utils';

// ==============================
// Verification status helpers
// ==============================

const VERIFICATION_CONFIG: Record<
  string,
  { label: string; variant: 'warning' | 'default' | 'success' | 'error' }
> = {
  UNVERIFIED: { label: 'Не верифицирован', variant: 'warning' },
  PENDING: { label: 'На проверке', variant: 'default' },
  VERIFIED: { label: 'Верифицирован', variant: 'success' },
  REJECTED: { label: 'Отклонено', variant: 'error' },
};

// ==============================
// Quick links configuration
// ==============================

const QUICK_LINKS = [
  {
    href: '/account/profile',
    icon: User,
    label: 'Профиль',
    description: 'Личные данные',
  },
  {
    href: '/account/watchlist',
    icon: BookmarkSimple,
    label: 'Избранное',
    description: 'Сохранённый контент',
  },
  {
    href: '/account/history',
    icon: Clock,
    label: 'История',
    description: 'Просмотренный контент',
  },
  {
    href: '/account/settings',
    icon: Gear,
    label: 'Настройки',
    description: 'Уведомления и безопасность',
  },
  {
    href: '/account/subscriptions',
    icon: Crown,
    label: 'Подписки',
    description: 'Управление подписками',
  },
  {
    href: '/account/payments',
    icon: CreditCard,
    label: 'Платежи',
    description: 'История транзакций',
  },
];

/**
 * Account dashboard page
 */
export default function AccountDashboardPage() {
  const { user } = useAuthStore();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: verification, isLoading: isVerificationLoading } = useVerificationStatus();
  const { data: activeSubscription } = useActiveSubscription();
  const { data: continueWatchingData } = useContinueWatching(6);

  const isLoading = isProfileLoading || isVerificationLoading;

  const verificationStatus = verification?.status || user?.verificationStatus || 'UNVERIFIED';
  const verificationConfig = VERIFICATION_CONFIG[verificationStatus] || VERIFICATION_CONFIG.UNVERIFIED;

  const displayName = [
    profile?.firstName || user?.firstName,
    profile?.lastName || user?.lastName,
  ]
    .filter(Boolean)
    .join(' ') || 'Пользователь';

  const continueItems = continueWatchingData?.items || continueWatchingData || [];

  return (
    <div className="py-8 md:py-12">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4 rounded-xl border border-mp-border bg-mp-surface/30 p-5">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </>
        ) : (
          <>
            <UserAvatar
              src={profile?.avatarUrl || user?.avatarUrl}
              name={displayName}
              size="xl"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-mp-text-primary truncate">
                  {displayName}
                </h1>
                {verificationStatus === 'VERIFIED' && (
                  <Badge variant="success" className="text-[10px] shrink-0">
                    <Shield className="mr-1 h-3 w-3" />
                    Верифицирован
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-mp-text-secondary truncate">
                {user?.email || ''}
              </p>
              {activeSubscription && (
                <Badge variant="default" className="mt-1.5 text-[10px]">
                  <Crown className="mr-1 h-3 w-3" />
                  {(activeSubscription as any).plan?.name || 'Подписка'}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-mp-accent-primary/20 bg-mp-accent-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-mp-text-secondary">Подписка</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-28" />
            ) : (
              <p className="mt-1 text-sm font-semibold text-mp-text-primary truncate">
                {(profile as any)?.activeSubscription?.plan?.name || 'Нет'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-mp-accent-secondary/20 bg-mp-accent-secondary/5">
          <CardContent className="p-4">
            <p className="text-xs text-mp-text-secondary">Бонусы</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-20" />
            ) : (
              <p className="mt-1 text-sm font-semibold text-mp-accent-secondary">
                {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                }).format(user?.bonusBalance ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-mp-accent-tertiary/20 bg-mp-accent-tertiary/5">
          <CardContent className="p-4">
            <p className="text-xs text-mp-text-secondary">Верификация</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-28" />
            ) : (
              <Badge variant={verificationConfig.variant} className="mt-1 text-[10px]">
                {verificationConfig.label}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-mp-text-secondary">Реферальный код</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-24" />
            ) : (
              <p className="mt-1 font-mono text-sm font-semibold text-mp-text-primary">
                {user?.referralCode || '---'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Continue Watching */}
      {Array.isArray(continueItems) && continueItems.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-mp-text-primary">
              Продолжить просмотр
            </h2>
            <Link
              href="/account/history"
              className="text-sm text-mp-text-secondary hover:text-mp-accent-primary transition-colors"
            >
              Вся история
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mb-2 scrollbar-thin">
            {continueItems.slice(0, 6).map((item: any) => {
              const content = item.content || {};
              const contentId = content.id || item.contentId;
              const duration = content.duration || 0;
              const progressSeconds = item.progressSeconds || 0;
              const progressPercent = duration > 0
                ? Math.min(Math.round((progressSeconds / duration) * 100), 100)
                : 0;

              return (
                <Link
                  key={item.id || contentId}
                  href={`/watch/${contentId}`}
                  className="group w-48 shrink-0"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-mp-surface">
                    {content.thumbnailUrl ? (
                      <ContentImage
                        src={content.thumbnailUrl}
                        alt={content.title || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FilmStrip className="h-8 w-8 text-mp-text-disabled" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                      <Play className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    {duration > 0 && (
                      <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {formatDuration(duration)}
                      </div>
                    )}
                    {/* Progress bar at bottom */}
                    <div className="absolute bottom-0 left-0 right-0">
                      <div className="h-1 bg-white/20">
                        <div
                          className="h-full bg-mp-accent-primary transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium text-mp-text-primary group-hover:text-mp-accent-primary transition-colors">
                    {content.title || 'Без названия'}
                  </p>
                  <p className="text-[11px] text-mp-text-secondary">
                    {formatDuration(progressSeconds)} / {formatDuration(duration)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Subscription card */}
        <Link href="/account/subscriptions">
          <Card className="group cursor-pointer transition-colors hover:border-mp-accent-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mp-accent-primary/20">
                <Crown className="h-6 w-6 text-mp-accent-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-mp-text-secondary">Подписка</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-40" />
                ) : (
                  <p className="mt-0.5 truncate font-medium text-mp-text-primary">
                    {(profile as any)?.activeSubscription?.plan?.name || 'Нет активной подписки'}
                  </p>
                )}
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-mp-text-secondary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>

        {/* Bonus card */}
        <Link href="/bonuses">
          <Card className="group cursor-pointer transition-colors hover:border-mp-accent-secondary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mp-accent-secondary/20">
                <Gift className="h-6 w-6 text-mp-accent-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-mp-text-secondary">Бонусы</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-24" />
                ) : (
                  <p className="mt-0.5 font-medium text-mp-text-primary">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(user?.bonusBalance ?? 0)}
                  </p>
                )}
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-mp-text-secondary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>

        {/* Partner program card */}
        <Link href="/partner">
          <Card className="group cursor-pointer transition-colors hover:border-mp-accent-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mp-accent-primary/20">
                <Users className="h-6 w-6 text-mp-accent-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-mp-text-secondary">Партнёрская программа</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-32" />
                ) : (
                  <p className="mt-0.5 font-mono text-sm font-medium text-mp-text-primary">
                    {user?.referralCode || '---'}
                  </p>
                )}
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-mp-text-secondary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>

        {/* Verification card */}
        <Link href="/account/verification">
          <Card className="group cursor-pointer transition-colors hover:border-mp-accent-secondary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mp-accent-secondary/20">
                <Shield className="h-6 w-6 text-mp-accent-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-mp-text-secondary">Верификация</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-36" />
                ) : (
                  <Badge variant={verificationConfig.variant} className="mt-1">
                    {verificationConfig.label}
                  </Badge>
                )}
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-mp-text-secondary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-mp-text-primary">
          Быстрые ссылки
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="group cursor-pointer transition-colors hover:border-mp-border/80 hover:bg-mp-surface/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mp-surface">
                    <link.icon className="h-5 w-5 text-mp-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-mp-text-primary">{link.label}</p>
                    <p className="text-xs text-mp-text-secondary">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-mp-text-secondary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
