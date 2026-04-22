'use client';

import { CreditCard, QrCode, BuildingOffice, Check } from '@phosphor-icons/react';
import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PaymentMethodType } from '@/types';

interface PaymentMethodOption {
  type: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    type: 'CARD',
    name: 'Банковская карта',
    description: 'Visa, Mastercard, МИР через YooKassa',
    icon: CreditCard,
    recommended: true,
  },
  {
    type: 'SBP',
    name: 'СБП',
    description: 'Оплата по QR-коду через приложение банка',
    icon: QrCode,
  },
  {
    type: 'BANK_TRANSFER',
    name: 'Банковский перевод',
    description: 'Оплата по реквизитам для юридических лиц',
    icon: BuildingOffice,
  },
];

interface PaymentMethodSelectorProps {
  selected: PaymentMethodType;
  onSelect: (method: PaymentMethodType) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodSelector({
  selected,
  onSelect,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium text-mp-text-primary">
        Способ оплаты
      </Label>

      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selected === method.type;

          return (
            <button
              key={method.type}
              type="button"
              onClick={() => !disabled && onSelect(method.type)}
              disabled={disabled}
              className={cn(
                'group relative w-full rounded-lg border p-4 text-left transition-all',
                'focus:outline-none focus:ring-2 focus:ring-mp-accent-primary focus:ring-offset-2 focus:ring-offset-background',
                isSelected
                  ? 'border-mp-accent-primary bg-mp-accent-primary/5'
                  : 'border-mp-border hover:border-mp-border/80 hover:bg-mp-surface',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {/* Recommended badge */}
              {method.recommended && (
                <span className="absolute -top-2 right-3 rounded-full bg-mp-accent-primary px-2 py-0.5 text-[10px] font-medium text-white">
                  Рекомендуем
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Selection indicator */}
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected
                      ? 'border-mp-accent-primary bg-mp-accent-primary'
                      : 'border-mp-border group-hover:border-mp-text-secondary'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>

                {/* Icon */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isSelected
                      ? 'bg-mp-accent-primary/20 text-mp-accent-primary'
                      : 'bg-mp-surface text-mp-text-secondary group-hover:text-mp-text-primary'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <span
                    className={cn(
                      'block font-medium transition-colors',
                      isSelected ? 'text-mp-text-primary' : 'text-mp-text-primary'
                    )}
                  >
                    {method.name}
                  </span>
                  <span className="block text-sm text-mp-text-secondary">
                    {method.description}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
interface PaymentMethodSelectorCompactProps {
  selected: PaymentMethodType;
  onSelect: (method: PaymentMethodType) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodSelectorCompact({
  selected,
  onSelect,
  disabled = false,
  className,
}: PaymentMethodSelectorCompactProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon;
        const isSelected = selected === method.type;

        return (
          <button
            key={method.type}
            type="button"
            onClick={() => !disabled && onSelect(method.type)}
            disabled={disabled}
            className={cn(
              'flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-mp-accent-primary',
              isSelected
                ? 'border-mp-accent-primary bg-mp-accent-primary/10'
                : 'border-mp-border hover:border-mp-border/80 hover:bg-mp-surface/50',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                isSelected ? 'text-mp-accent-primary' : 'text-mp-text-secondary'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium',
                isSelected ? 'text-mp-text-primary' : 'text-mp-text-secondary'
              )}
            >
              {method.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
