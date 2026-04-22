'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Gift,
  ArrowsClockwise,
  TrendUp,
  Wallet,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBonus, formatBonusAmount, useBonusStatistics } from '@/hooks/use-bonus';

/**
 * Full bonus balance card with statistics
 */
interface BonusBalanceCardProps {
  showActions?: boolean;
  showStatistics?: boolean;
  className?: string;
}

export function BonusBalanceCard({
  showActions = true,
  showStatistics = true,
  className,
}: BonusBalanceCardProps) {
  const {
    balance,
    lifetimeEarned,
    lifetimeSpent,
    expiringIn30Days,
    isLoading,
    refetchBalance,
  } = useBonus();

  const { data: statistics, isLoading: isLoadingStats } = useBonusStatistics();

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-mp-accent-primary/10 via-mp-surface to-mp-accent-secondary/10 pb-0">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-mp-accent-secondary" />
              Баланс бонусов
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchBalance()}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <ArrowsClockwise
              className={cn('h-4 w-4', isLoading && 'animate-spin')}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Main balance */}
        <div className="mb-6 text-center">
          {isLoading ? (
            <Skeleton className="mx-auto h-12 w-48" />
          ) : (
            <div>
              <span className="text-4xl font-bold text-mp-text-primary">
                {formatBonusAmount(balance)}
              </span>
              <span className="ml-2 text-xl text-mp-text-secondary">₽</span>
            </div>
          )}
          <p className="mt-1 text-sm text-mp-text-secondary">
            Доступно для использования
          </p>
        </div>

        {/* Statistics grid */}
        {showStatistics && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatItem
              icon={TrendUp}
              iconColor="text-green-400"
              label="Всего заработано"
              value={formatBonusAmount(lifetimeEarned)}
              isLoading={isLoading}
            />
            <StatItem
              icon={ArrowUpRight}
              iconColor="text-red-400"
              label="Всего потрачено"
              value={formatBonusAmount(lifetimeSpent)}
              isLoading={isLoading}
            />
            <StatItem
              icon={ArrowDownLeft}
              iconColor="text-blue-400"
              label="За этот месяц"
              value={formatBonusAmount(statistics?.earnedThisMonth ?? 0)}
              isLoading={isLoadingStats}
            />
            <StatItem
              icon={Clock}
              iconColor="text-yellow-400"
              label="Истекает (30 дней)"
              value={formatBonusAmount(expiringIn30Days)}
              isLoading={isLoading}
              highlight={expiringIn30Days > 0}
            />
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2">
            <Button asChild className="flex-1">
              <Link href="/bonuses">
                <Gift className="mr-2 h-4 w-4" />
                Подробнее
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/bonuses/withdraw">
                <Wallet className="mr-2 h-4 w-4" />
                Вывести
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Single stat item
 */
interface StatItemProps {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
  isLoading?: boolean;
  highlight?: boolean;
}

function StatItem({
  icon: Icon,
  iconColor,
  label,
  value,
  isLoading,
  highlight,
}: StatItemProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-mp-border bg-mp-surface/50 p-3 text-center',
        highlight && 'border-yellow-500/50 bg-yellow-500/5'
      )}
    >
      <Icon className={cn('mx-auto mb-1 h-4 w-4', iconColor)} />
      {isLoading ? (
        <Skeleton className="mx-auto mb-1 h-5 w-16" />
      ) : (
        <p
          className={cn(
            'text-lg font-semibold',
            highlight ? 'text-yellow-400' : 'text-mp-text-primary'
          )}
        >
          {value}
        </p>
      )}
      <p className="text-xs text-mp-text-secondary">{label}</p>
    </div>
  );
}

/**
 * Skeleton for the full card
 */
export function BonusBalanceCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-mp-accent-primary/10 via-mp-surface to-mp-accent-secondary/10 pb-0">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-6 text-center">
          <Skeleton className="mx-auto h-12 w-48" />
          <Skeleton className="mx-auto mt-1 h-4 w-40" />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-mp-border bg-mp-surface/50 p-3 text-center"
            >
              <Skeleton className="mx-auto mb-1 h-4 w-4" />
              <Skeleton className="mx-auto mb-1 h-5 w-16" />
              <Skeleton className="mx-auto h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}
