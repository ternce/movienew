'use client';

import { Warning, Clock, Gift, X } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useExpiringBonuses, formatBonusAmount } from '@/hooks/use-bonus';
import { useBonusPreferencesStore } from '@/stores/bonus.store';

/**
 * Alert showing bonuses that will expire soon
 */
interface BonusExpiringAlertProps {
  withinDays?: number;
  dismissible?: boolean;
  variant?: 'banner' | 'card' | 'inline';
  className?: string;
}

export function BonusExpiringAlert({
  withinDays = 30,
  dismissible = true,
  variant = 'banner',
  className,
}: BonusExpiringAlertProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const { showExpiringAlert, expiringAlertDays } = useBonusPreferencesStore();

  const effectiveDays = withinDays || expiringAlertDays;
  const { data, isLoading } = useExpiringBonuses(effectiveDays);

  const totalExpiring = data?.totalExpiring ?? 0;
  const expiringBonuses = data?.expiringBonuses ?? [];

  // Don't show if dismissed, loading, no expiring bonuses, or user disabled alert
  if (dismissed || isLoading || totalExpiring === 0 || !showExpiringAlert) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Group by urgency
  const urgent = expiringBonuses.filter((b) => b.daysRemaining <= 7);
  const upcoming = expiringBonuses.filter(
    (b) => b.daysRemaining > 7 && b.daysRemaining <= 30
  );

  const urgentTotal = urgent.reduce((sum, b) => sum + b.amount, 0);
  const upcomingTotal = upcoming.reduce((sum, b) => sum + b.amount, 0);

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400',
          className
        )}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {formatBonusAmount(totalExpiring)} ₽ бонусов истекает в течение{' '}
          {effectiveDays} дней
        </span>
        <Link
          href="/bonuses"
          className="ml-auto text-xs underline hover:no-underline"
        >
          Подробнее
        </Link>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'relative rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4',
          className
        )}
      >
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="absolute right-2 top-2 h-6 w-6 text-mp-text-secondary hover:text-mp-text-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
            <Warning className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-mp-text-primary">
              Бонусы скоро истекают
            </h3>

            <div className="space-y-1 text-sm">
              {urgentTotal > 0 && (
                <p className="text-red-400">
                  <span className="font-semibold">
                    {formatBonusAmount(urgentTotal)} ₽
                  </span>{' '}
                  истечёт в течение 7 дней
                </p>
              )}
              {upcomingTotal > 0 && (
                <p className="text-yellow-400">
                  <span className="font-semibold">
                    {formatBonusAmount(upcomingTotal)} ₽
                  </span>{' '}
                  истечёт в течение 30 дней
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button asChild size="sm">
                <Link href="/bonuses">Использовать бонусы</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/bonuses/history">История</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div
      className={cn(
        'relative flex items-center gap-4 rounded-lg border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent px-4 py-3',
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
        <Clock className="h-5 w-5" />
      </div>

      <div className="flex-1">
        <p className="font-medium text-mp-text-primary">
          <span className="text-yellow-400">
            {formatBonusAmount(totalExpiring)} ₽
          </span>{' '}
          бонусов истекает в течение {effectiveDays} дней
        </p>
        <p className="text-sm text-mp-text-secondary">
          Используйте бонусы при оплате или выведите на счёт
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/bonuses">
            <Gift className="mr-2 h-4 w-4" />
            Использовать
          </Link>
        </Button>

        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 text-mp-text-secondary hover:text-mp-text-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact expiring alert for lists/tables
 */
interface ExpiringBadgeProps {
  daysRemaining: number;
  amount?: number;
  className?: string;
}

export function ExpiringBadge({
  daysRemaining,
  amount,
  className,
}: ExpiringBadgeProps) {
  const isUrgent = daysRemaining <= 7;
  const isNear = daysRemaining <= 30;

  if (!isNear) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        isUrgent
          ? 'bg-red-500/20 text-red-400'
          : 'bg-yellow-500/20 text-yellow-400',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {daysRemaining === 0
        ? 'Сегодня'
        : daysRemaining === 1
          ? 'Завтра'
          : `${daysRemaining} дн.`}
      {amount !== undefined && (
        <span className="ml-1">{formatBonusAmount(amount)} ₽</span>
      )}
    </span>
  );
}
