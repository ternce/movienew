'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
import type { BonusTransaction } from '@/hooks/use-bonus';

/**
 * Bonus type badge variants
 */
const bonusTypeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      type: {
        EARNED: 'bg-green-500/20 text-green-400',
        SPENT: 'bg-red-500/20 text-red-400',
        WITHDRAWN: 'bg-blue-500/20 text-blue-400',
        EXPIRED: 'bg-yellow-500/20 text-yellow-400',
        ADJUSTMENT: 'bg-purple-500/20 text-purple-400',
      },
    },
    defaultVariants: {
      type: 'EARNED',
    },
  }
);

/**
 * Bonus source badge variants
 */
const bonusSourceVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      source: {
        PARTNER: 'bg-mp-accent-primary/20 text-mp-accent-primary',
        PROMO: 'bg-mp-accent-tertiary/20 text-mp-accent-tertiary',
        REFUND: 'bg-emerald-500/20 text-emerald-400',
        REFERRAL_BONUS: 'bg-cyan-500/20 text-cyan-400',
        ACTIVITY: 'bg-amber-500/20 text-amber-400',
      },
    },
    defaultVariants: {
      source: 'PARTNER',
    },
  }
);

/**
 * Type labels in Russian
 */
const typeLabels: Record<BonusTransaction['type'], string> = {
  EARNED: 'Начислено',
  SPENT: 'Списано',
  WITHDRAWN: 'Выведено',
  EXPIRED: 'Истекло',
  ADJUSTMENT: 'Корректировка',
};

/**
 * Source labels in Russian
 */
const sourceLabels: Record<BonusTransaction['source'], string> = {
  PARTNER: 'Партнёрская программа',
  PROMO: 'Промо-акция',
  REFUND: 'Возврат',
  REFERRAL_BONUS: 'Реферальный бонус',
  ACTIVITY: 'Активность',
};

/**
 * Bonus type badge
 */
interface BonusTypeBadgeProps extends VariantProps<typeof bonusTypeVariants> {
  type: BonusTransaction['type'];
  showLabel?: boolean;
  className?: string;
}

export function BonusTypeBadge({
  type,
  showLabel = true,
  className,
}: BonusTypeBadgeProps) {
  return (
    <span className={cn(bonusTypeVariants({ type }), className)}>
      {showLabel ? typeLabels[type] : type}
    </span>
  );
}

/**
 * Bonus source badge
 */
interface BonusSourceBadgeProps extends VariantProps<typeof bonusSourceVariants> {
  source: BonusTransaction['source'];
  showLabel?: boolean;
  className?: string;
}

export function BonusSourceBadge({
  source,
  showLabel = true,
  className,
}: BonusSourceBadgeProps) {
  return (
    <span className={cn(bonusSourceVariants({ source }), className)}>
      {showLabel ? sourceLabels[source] : source}
    </span>
  );
}

/**
 * Combined badge showing both type and source
 */
interface BonusCombinedBadgeProps {
  type: BonusTransaction['type'];
  source: BonusTransaction['source'];
  className?: string;
}

export function BonusCombinedBadge({
  type,
  source,
  className,
}: BonusCombinedBadgeProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <BonusTypeBadge type={type} />
      <BonusSourceBadge source={source} />
    </div>
  );
}
