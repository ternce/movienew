'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  Gift,
  TrendUp,
  Wallet,
} from '@phosphor-icons/react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBonus, useBonusStatistics, formatBonusAmount } from '@/hooks/use-bonus';

/**
 * Detailed bonus statistics summary
 */
interface BonusStatsSummaryProps {
  className?: string;
}

export function BonusStatsSummary({ className }: BonusStatsSummaryProps) {
  const { balance, isLoading: isLoadingBalance } = useBonus();
  const { data: stats, isLoading: isLoadingStats } = useBonusStatistics();

  const isLoading = isLoadingBalance || isLoadingStats;

  const statItems = [
    {
      icon: Gift,
      iconColor: 'text-mp-accent-secondary',
      iconBg: 'bg-mp-accent-secondary/20',
      label: 'Текущий баланс',
      value: formatBonusAmount(balance),
      suffix: '₽',
    },
    {
      icon: TrendUp,
      iconColor: 'text-green-400',
      iconBg: 'bg-green-500/20',
      label: 'Всего заработано',
      value: formatBonusAmount(stats?.lifetimeEarned ?? 0),
      suffix: '₽',
    },
    {
      icon: ArrowUpRight,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/20',
      label: 'Всего потрачено',
      value: formatBonusAmount(stats?.lifetimeSpent ?? 0),
      suffix: '₽',
    },
    {
      icon: ArrowDownLeft,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      label: 'Ожидает начисления',
      value: formatBonusAmount(stats?.pendingEarnings ?? 0),
      suffix: '₽',
    },
    {
      icon: Clock,
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/20',
      label: 'Истекает (30 дней)',
      value: formatBonusAmount(stats?.expiringIn30Days ?? 0),
      suffix: '₽',
      highlight: (stats?.expiringIn30Days ?? 0) > 0,
    },
    {
      icon: Calendar,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      label: 'Транзакций за месяц',
      value: stats?.transactionsThisMonth?.toString() ?? '0',
      suffix: '',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendUp className="h-5 w-5 text-mp-accent-primary" />
          Статистика бонусов
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {statItems.map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              iconColor={item.iconColor}
              iconBg={item.iconBg}
              label={item.label}
              value={item.value}
              suffix={item.suffix}
              highlight={item.highlight}
              isLoading={isLoading}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Single stat card
 */
interface StatCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
  isLoading?: boolean;
}

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  suffix,
  highlight,
  isLoading,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-mp-border bg-mp-surface/50 p-3',
        highlight && 'border-yellow-500/50 bg-yellow-500/5'
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn('rounded-lg p-1.5', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <span className="text-xs text-mp-text-secondary">{label}</span>
      </div>

      {isLoading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <p
          className={cn(
            'mt-2 text-lg font-bold',
            highlight ? 'text-yellow-400' : 'text-mp-text-primary'
          )}
        >
          {value}
          {suffix && (
            <span className="ml-1 text-sm font-normal text-mp-text-secondary">
              {suffix}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Compact stats row for dashboards
 */
interface BonusStatsRowProps {
  className?: string;
}

export function BonusStatsRow({ className }: BonusStatsRowProps) {
  const { balance, lifetimeEarned, lifetimeSpent, expiringIn30Days, isLoading } =
    useBonus();

  const items = [
    {
      label: 'Баланс',
      value: formatBonusAmount(balance),
      color: 'text-mp-accent-secondary',
    },
    {
      label: 'Заработано',
      value: formatBonusAmount(lifetimeEarned),
      color: 'text-green-400',
    },
    {
      label: 'Потрачено',
      value: formatBonusAmount(lifetimeSpent),
      color: 'text-red-400',
    },
    {
      label: 'Истекает',
      value: formatBonusAmount(expiringIn30Days),
      color: expiringIn30Days > 0 ? 'text-yellow-400' : 'text-mp-text-secondary',
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-4 divide-x divide-mp-border rounded-lg border border-mp-border bg-mp-surface/50',
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3 text-center">
          {isLoading ? (
            <>
              <Skeleton className="mx-auto mb-1 h-5 w-16" />
              <Skeleton className="mx-auto h-3 w-12" />
            </>
          ) : (
            <>
              <p className={cn('text-lg font-semibold tabular-nums', item.color)}>
                {item.value} ₽
              </p>
              <p className="text-xs text-mp-text-secondary">{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Monthly comparison card
 */
interface MonthlyComparisonCardProps {
  className?: string;
}

export function MonthlyComparisonCard({ className }: MonthlyComparisonCardProps) {
  const { data: stats, isLoading } = useBonusStatistics();

  const earned = stats?.earnedThisMonth ?? 0;
  const spent = stats?.spentThisMonth ?? 0;
  const net = earned - spent;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-mp-text-secondary">
          За этот месяц
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ) : (
          <>
            <p
              className={cn(
                'text-2xl font-bold',
                net >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {net >= 0 ? '+' : ''}
              {formatBonusAmount(net)} ₽
            </p>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-green-400">
                +{formatBonusAmount(earned)} ₽
              </span>
              <span className="text-red-400">
                −{formatBonusAmount(spent)} ₽
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
