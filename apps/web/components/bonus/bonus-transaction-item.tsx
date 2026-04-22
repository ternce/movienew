'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Gift,
  Minus,
  ArrowsClockwise,
  Wallet,
} from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import type { BonusTransaction } from '@/hooks/use-bonus';
import { formatBonusAmount } from '@/hooks/use-bonus';

import { BonusSourceBadge, BonusTypeBadge } from './bonus-badges';

/**
 * Icons for each transaction type
 */
const typeIcons: Record<BonusTransaction['type'], React.ElementType> = {
  EARNED: ArrowDownLeft,
  SPENT: ArrowUpRight,
  WITHDRAWN: Wallet,
  EXPIRED: Clock,
  ADJUSTMENT: ArrowsClockwise,
};

/**
 * Icon colors for each transaction type
 */
const typeColors: Record<BonusTransaction['type'], string> = {
  EARNED: 'text-green-400 bg-green-500/20',
  SPENT: 'text-red-400 bg-red-500/20',
  WITHDRAWN: 'text-blue-400 bg-blue-500/20',
  EXPIRED: 'text-yellow-400 bg-yellow-500/20',
  ADJUSTMENT: 'text-purple-400 bg-purple-500/20',
};

/**
 * Amount display with sign
 */
function AmountDisplay({
  amount,
  type,
}: {
  amount: number;
  type: BonusTransaction['type'];
}) {
  const isPositive = type === 'EARNED' || (type === 'ADJUSTMENT' && amount > 0);
  const isNegative =
    type === 'SPENT' ||
    type === 'WITHDRAWN' ||
    type === 'EXPIRED' ||
    (type === 'ADJUSTMENT' && amount < 0);

  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        isPositive && 'text-green-400',
        isNegative && 'text-red-400',
        !isPositive && !isNegative && 'text-mp-text-primary'
      )}
    >
      {isPositive && '+'}
      {isNegative && !String(amount).startsWith('-') && '-'}
      {formatBonusAmount(Math.abs(amount))} ₽
    </span>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Single bonus transaction item
 */
interface BonusTransactionItemProps {
  transaction: BonusTransaction;
  showBadges?: boolean;
  compact?: boolean;
  className?: string;
}

export function BonusTransactionItem({
  transaction,
  showBadges = true,
  compact = false,
  className,
}: BonusTransactionItemProps) {
  const Icon = typeIcons[transaction.type];
  const iconColor = typeColors[transaction.type];

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between py-2',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg',
              iconColor
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm text-mp-text-secondary line-clamp-1">
            {transaction.description}
          </span>
        </div>
        <AmountDisplay amount={transaction.amount} type={transaction.type} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border border-mp-border bg-mp-surface/50 p-4 transition-colors hover:bg-mp-surface',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          iconColor
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-mp-text-primary line-clamp-1">
            {transaction.description}
          </p>
          <AmountDisplay amount={transaction.amount} type={transaction.type} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-mp-text-secondary">
          <span>{formatDate(transaction.createdAt)}</span>

          {transaction.expiresAt && (
            <>
              <span className="text-mp-border">•</span>
              <span className="flex items-center gap-1 text-yellow-400">
                <Clock className="h-3 w-3" />
                Истекает{' '}
                {new Intl.DateTimeFormat('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                }).format(new Date(transaction.expiresAt))}
              </span>
            </>
          )}
        </div>

        {showBadges && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <BonusTypeBadge type={transaction.type} />
            <BonusSourceBadge source={transaction.source} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton for loading state
 */
export function BonusTransactionItemSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 animate-pulse rounded-lg bg-mp-surface" />
          <div className="h-4 w-32 animate-pulse rounded bg-mp-surface" />
        </div>
        <div className="h-4 w-20 animate-pulse rounded bg-mp-surface" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-mp-surface" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-48 animate-pulse rounded bg-mp-surface" />
          <div className="h-5 w-20 animate-pulse rounded bg-mp-surface" />
        </div>
        <div className="h-4 w-32 animate-pulse rounded bg-mp-surface" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-20 animate-pulse rounded bg-mp-surface" />
          <div className="h-5 w-28 animate-pulse rounded bg-mp-surface" />
        </div>
      </div>
    </div>
  );
}
