'use client';

import { SpinnerGap } from '@phosphor-icons/react';
import * as React from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface RenewalToggleProps {
  autoRenew: boolean;
  onToggle?: (autoRenew: boolean) => void;
  isLoading?: boolean;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RenewalToggle({
  autoRenew,
  onToggle,
  isLoading = false,
  showLabel = false,
  disabled = false,
  className,
}: RenewalToggleProps) {
  const handleToggle = (checked: boolean) => {
    if (!isLoading && !disabled) {
      onToggle?.(checked);
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLabel && (
        <Label
          htmlFor="auto-renew"
          className={cn(
            'text-sm',
            autoRenew ? 'text-mp-text-primary' : 'text-mp-text-secondary'
          )}
        >
          Автопродление
        </Label>
      )}

      <div className="relative">
        <Switch
          id="auto-renew"
          checked={autoRenew}
          onCheckedChange={handleToggle}
          disabled={isLoading || disabled}
          className={cn(isLoading && 'opacity-50')}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <SpinnerGap className="h-3 w-3 animate-spin text-mp-accent-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Extended renewal toggle with description
 */
interface RenewalToggleWithDescriptionProps extends RenewalToggleProps {
  planName?: string;
  price?: number;
  currency?: string;
}

export function RenewalToggleWithDescription({
  autoRenew,
  onToggle,
  isLoading = false,
  disabled = false,
  planName,
  price,
  currency = 'RUB',
  className,
}: RenewalToggleWithDescriptionProps) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-mp-border bg-mp-surface p-4',
        className
      )}
    >
      <div className="space-y-1">
        <Label
          htmlFor="auto-renew-desc"
          className="text-sm font-medium text-mp-text-primary"
        >
          Автоматическое продление
        </Label>
        <p className="text-xs text-mp-text-secondary">
          {autoRenew ? (
            <>
              {planName && price ? (
                <>
                  Подписка будет автоматически продлена за{' '}
                  <span className="font-medium text-mp-text-primary">
                    {formatPrice(price)}
                  </span>
                </>
              ) : (
                'Подписка будет автоматически продлена'
              )}
            </>
          ) : (
            'Подписка завершится по истечении срока'
          )}
        </p>
      </div>

      <div className="relative">
        <Switch
          id="auto-renew-desc"
          checked={autoRenew}
          onCheckedChange={(checked) => !isLoading && !disabled && onToggle?.(checked)}
          disabled={isLoading || disabled}
          className={cn(isLoading && 'opacity-50')}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <SpinnerGap className="h-3 w-3 animate-spin text-mp-accent-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
