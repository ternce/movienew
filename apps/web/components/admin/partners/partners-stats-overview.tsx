'use client';

import { Users, Coins, Wallet, TrendUp, Clock, CheckCircle } from '@phosphor-icons/react';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AdminPartnerStats, AdminWithdrawalStats } from '@/types';

interface PartnersStatsOverviewProps {
  partnerStats?: AdminPartnerStats;
  withdrawalStats?: AdminWithdrawalStats;
  isLoading?: boolean;
  className?: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PartnersStatsOverview({
  partnerStats,
  withdrawalStats,
  isLoading,
  className,
}: PartnersStatsOverviewProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Partner stats */}
      <div>
        <h3 className="text-sm font-medium text-mp-text-secondary mb-3">Партнёры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Всего партнёров"
            value={partnerStats?.totalPartners.toString() || '0'}
            icon={Users}
            iconColor="text-mp-accent-primary"
          />
          <StatCard
            label="Активных"
            value={partnerStats?.activePartners.toString() || '0'}
            icon={CheckCircle}
            iconColor="text-emerald-400"
          />
          <StatCard
            label="Новых за месяц"
            value={partnerStats?.newPartnersThisMonth.toString() || '0'}
            icon={TrendUp}
            iconColor="text-mp-accent-secondary"
          />
          <StatCard
            label="Общий заработок"
            value={formatCurrency(partnerStats?.totalEarnings || 0)}
            icon={Coins}
            iconColor="text-yellow-400"
          />
        </div>
      </div>

      {/* Withdrawal stats */}
      <div>
        <h3 className="text-sm font-medium text-mp-text-secondary mb-3">Выводы</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Ожидает рассмотрения"
            value={withdrawalStats?.pendingCount.toString() || '0'}
            subtext={formatCurrency(withdrawalStats?.pendingAmount || 0)}
            icon={Clock}
            iconColor="text-yellow-400"
            highlight={!!withdrawalStats?.pendingCount && withdrawalStats.pendingCount > 0}
          />
          <StatCard
            label="Одобрено"
            value={withdrawalStats?.approvedCount.toString() || '0'}
            subtext={formatCurrency(withdrawalStats?.approvedAmount || 0)}
            icon={CheckCircle}
            iconColor="text-blue-400"
          />
          <StatCard
            label="В обработке"
            value={withdrawalStats?.processingCount.toString() || '0'}
            subtext={formatCurrency(withdrawalStats?.processingAmount || 0)}
            icon={TrendUp}
            iconColor="text-mp-accent-secondary"
          />
          <StatCard
            label="Выполнено за месяц"
            value={withdrawalStats?.completedThisMonth.toString() || '0'}
            subtext={formatCurrency(withdrawalStats?.completedAmountThisMonth || 0)}
            icon={Wallet}
            iconColor="text-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Individual stats card
 */
interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  iconColor: string;
  highlight?: boolean;
  className?: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor,
  highlight,
  className,
}: StatCardProps) {
  return (
    <Card className={cn(highlight && 'border-yellow-500/50', className)}>
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
function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
