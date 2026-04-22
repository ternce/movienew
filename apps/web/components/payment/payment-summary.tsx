'use client';

import { Gift, Percent, ShieldCheck } from '@phosphor-icons/react';
import * as React from 'react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PaymentSummaryProps {
  subtotal: number;
  bonusDiscount?: number;
  promoDiscount?: number;
  total: number;
  currency?: string;
  planName?: string;
  planDescription?: string;
  className?: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number, currency: string = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentSummary({
  subtotal,
  bonusDiscount = 0,
  promoDiscount = 0,
  total,
  currency = 'RUB',
  planName,
  planDescription,
  className,
}: PaymentSummaryProps) {
  const hasDiscounts = bonusDiscount > 0 || promoDiscount > 0;
  const isFree = total <= 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-mp-border bg-mp-surface/50 p-6',
        className
      )}
    >
      {/* Plan info */}
      {planName && (
        <>
          <div className="space-y-1">
            <h3 className="font-semibold text-mp-text-primary">{planName}</h3>
            {planDescription && (
              <p className="text-sm text-mp-text-secondary">{planDescription}</p>
            )}
          </div>
          <Separator className="my-4" />
        </>
      )}

      {/* Price breakdown */}
      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-mp-text-secondary">Подписка</span>
          <span className="text-sm text-mp-text-primary">
            {formatCurrency(subtotal, currency)}
          </span>
        </div>

        {/* Bonus discount */}
        {bonusDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-mp-accent-secondary">
              <Gift className="h-4 w-4" />
              Бонусы
            </span>
            <span className="text-sm text-mp-accent-secondary">
              −{formatCurrency(bonusDiscount, currency)}
            </span>
          </div>
        )}

        {/* Promo discount */}
        {promoDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-mp-accent-primary">
              <Percent className="h-4 w-4" />
              Промокод
            </span>
            <span className="text-sm text-mp-accent-primary">
              −{formatCurrency(promoDiscount, currency)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      {hasDiscounts && <Separator className="my-4" />}

      <div className="flex items-center justify-between">
        <span className="font-medium text-mp-text-primary">Итого</span>
        <div className="text-right">
          {hasDiscounts && (
            <span className="mr-2 text-sm text-mp-text-disabled line-through">
              {formatCurrency(subtotal, currency)}
            </span>
          )}
          <span
            className={cn(
              'text-xl font-bold',
              isFree ? 'text-mp-success-text' : 'text-mp-text-primary'
            )}
          >
            {isFree ? 'Бесплатно' : formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      {/* Savings badge */}
      {hasDiscounts && !isFree && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-mp-success-bg/50 py-2 text-sm text-mp-success-text">
          <ShieldCheck className="h-4 w-4" />
          Вы экономите {formatCurrency(bonusDiscount + promoDiscount, currency)}
        </div>
      )}

      {/* Free payment badge */}
      {isFree && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-mp-success-bg py-2 text-sm text-mp-success-text">
          <Gift className="h-4 w-4" />
          Оплата не требуется — бонусы покрывают стоимость
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline summary
 */
interface PaymentSummaryInlineProps {
  original: number;
  final: number;
  currency?: string;
  className?: string;
}

export function PaymentSummaryInline({
  original,
  final,
  currency = 'RUB',
  className,
}: PaymentSummaryInlineProps) {
  const hasDiscount = final < original;
  const isFree = final <= 0;

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      {hasDiscount && (
        <span className="text-sm text-mp-text-disabled line-through">
          {formatCurrency(original, currency)}
        </span>
      )}
      <span
        className={cn(
          'text-lg font-bold',
          isFree ? 'text-mp-success-text' : 'text-mp-text-primary'
        )}
      >
        {isFree ? 'Бесплатно' : formatCurrency(final, currency)}
      </span>
    </div>
  );
}
