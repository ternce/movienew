'use client';

import { Gift } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBonus, formatBonusAmount } from '@/hooks/use-bonus';

/**
 * Compact bonus balance widget for header/sidebar
 */
interface BonusBalanceWidgetProps {
  variant?: 'default' | 'compact' | 'icon-only';
  showTooltip?: boolean;
  className?: string;
}

export function BonusBalanceWidget({
  variant = 'default',
  showTooltip = true,
  className,
}: BonusBalanceWidgetProps) {
  const { balance, expiringIn30Days, isLoading } = useBonus();

  const content = (
    <Link
      href="/bonuses"
      className={cn(
        'flex items-center gap-2 rounded-lg transition-colors',
        variant === 'default' &&
          'border border-mp-border bg-mp-surface/50 px-3 py-2 hover:bg-mp-surface',
        variant === 'compact' && 'px-2 py-1 hover:bg-mp-surface/50',
        variant === 'icon-only' && 'p-2 hover:bg-mp-surface/50',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-mp-accent-secondary/20 text-mp-accent-secondary',
          variant === 'icon-only' ? 'h-8 w-8' : 'h-7 w-7'
        )}
      >
        <Gift className={cn(variant === 'icon-only' ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
      </div>

      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-12" />
              {variant === 'default' && <Skeleton className="mt-0.5 h-3 w-16" />}
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-mp-text-primary">
                {formatBonusAmount(balance)} ₽
              </span>
              {variant === 'default' && (
                <span className="text-xs text-mp-text-secondary">
                  Бонусы
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Expiring indicator */}
      {expiringIn30Days > 0 && variant !== 'icon-only' && (
        <div className="ml-auto h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
      )}
    </Link>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1 text-sm">
              <p>
                Баланс: <span className="font-semibold">{formatBonusAmount(balance)} ₽</span>
              </p>
              {expiringIn30Days > 0 && (
                <p className="text-yellow-400">
                  Истекает через 30 дней: {formatBonusAmount(expiringIn30Days)} ₽
                </p>
              )}
              <p className="text-xs text-mp-text-secondary">
                Нажмите для подробностей
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/**
 * Bonus balance display for sidebar navigation
 */
interface BonusSidebarItemProps {
  collapsed?: boolean;
  className?: string;
}

export function BonusSidebarItem({
  collapsed = false,
  className,
}: BonusSidebarItemProps) {
  const { balance, expiringIn30Days, isLoading } = useBonus();

  if (collapsed) {
    return (
      <BonusBalanceWidget
        variant="icon-only"
        showTooltip
        className={className}
      />
    );
  }

  return (
    <Link
      href="/bonuses"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-mp-border/50 bg-gradient-to-r from-mp-accent-secondary/5 to-transparent px-3 py-2.5 transition-all hover:border-mp-accent-secondary/30 hover:from-mp-accent-secondary/10',
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mp-accent-secondary/20 text-mp-accent-secondary">
        <Gift className="h-4 w-4" />
      </div>

      <div className="flex-1">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-0.5 h-3 w-16" />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-mp-text-primary">
              {formatBonusAmount(balance)} ₽
            </p>
            <p className="text-xs text-mp-text-secondary">
              Ваши бонусы
            </p>
          </>
        )}
      </div>

      {expiringIn30Days > 0 && (
        <div
          className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"
          title={`${formatBonusAmount(expiringIn30Days)} ₽ истекает`}
        />
      )}
    </Link>
  );
}

/**
 * Inline bonus balance for text contexts
 */
interface InlineBonusBalanceProps {
  className?: string;
}

export function InlineBonusBalance({ className }: InlineBonusBalanceProps) {
  const { balance, isLoading } = useBonus();

  if (isLoading) {
    return <Skeleton className={cn('inline-block h-4 w-16', className)} />;
  }

  return (
    <span className={cn('font-semibold text-mp-accent-secondary', className)}>
      {formatBonusAmount(balance)} ₽
    </span>
  );
}
