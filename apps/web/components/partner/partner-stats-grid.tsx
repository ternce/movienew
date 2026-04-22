'use client';

import { Users, Coins, Wallet, TrendUp } from '@phosphor-icons/react';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PartnerDashboard } from '@/types';

interface PartnerStatsGridProps {
  dashboard?: PartnerDashboard | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Stats card configuration
 */
interface StatCardConfig {
  label: string;
  icon: React.ElementType;
  iconColor: string;
  getValue: (d: PartnerDashboard) => string;
  getSubtext?: (d: PartnerDashboard) => string | null;
}

const statsConfig: StatCardConfig[] = [
  {
    label: 'Всего рефералов',
    icon: Users,
    iconColor: 'text-mp-accent-primary',
    getValue: (d) => d.totalReferrals.toString(),
    getSubtext: (d) => `${d.activeReferrals} активных`,
  },
  {
    label: 'Общий заработок',
    icon: TrendUp,
    iconColor: 'text-mp-accent-secondary',
    getValue: (d) => formatCurrency(d.totalEarnings),
    getSubtext: (d) => {
      const diff = d.currentMonthEarnings - d.previousMonthEarnings;
      if (diff === 0) return null;
      const sign = diff > 0 ? '+' : '';
      return `${sign}${formatCurrency(diff)} за месяц`;
    },
  },
  {
    label: 'Ожидает выплаты',
    icon: Coins,
    iconColor: 'text-yellow-400',
    getValue: (d) => formatCurrency(d.pendingEarnings),
  },
  {
    label: 'Доступно к выводу',
    icon: Wallet,
    iconColor: 'text-emerald-400',
    getValue: (d) => formatCurrency(d.availableBalance),
    getSubtext: (d) => d.withdrawnAmount > 0 ? `Выведено: ${formatCurrency(d.withdrawnAmount)}` : null,
  },
];

export function PartnerStatsGrid({
  dashboard,
  isLoading,
  className,
}: PartnerStatsGridProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {statsConfig.map((stat) => {
        const subtext = stat.getSubtext?.(dashboard);
        return (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.getValue(dashboard)}
            subtext={subtext}
            icon={stat.icon}
            iconColor={stat.iconColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Individual stats card
 */
interface StatsCardProps {
  label: string;
  value: string;
  subtext?: string | null;
  icon: React.ElementType;
  iconColor: string;
  className?: string;
}

function StatsCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-mp-text-secondary">{label}</p>
            <p className="text-2xl font-bold text-mp-text-primary">{value}</p>
            {subtext && (
              <p className="text-xs text-mp-text-secondary">{subtext}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-mp-surface', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stats card skeleton
 */
function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
