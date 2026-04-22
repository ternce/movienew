'use client';

import { Gift, Minus, Plus, Check, WarningCircle, Clock, Warning } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BonusApplicatorProps {
  availableBalance: number;
  maxApplicable: number;
  appliedAmount: number;
  onApply: (amount: number) => void;
  orderTotal?: number;
  hasExpiringBonuses?: boolean;
  expiringAmount?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Validation error type
 */
interface ValidationError {
  type: 'INSUFFICIENT_BALANCE' | 'MAX_EXCEEDED' | 'EXCEEDS_ORDER';
  message: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BonusApplicator({
  availableBalance,
  maxApplicable,
  appliedAmount,
  onApply,
  orderTotal = 0,
  hasExpiringBonuses = false,
  expiringAmount = 0,
  disabled = false,
  className,
}: BonusApplicatorProps) {
  const [inputValue, setInputValue] = React.useState(String(appliedAmount));
  const [isEditing, setIsEditing] = React.useState(false);
  const [validationError, setValidationError] = React.useState<ValidationError | null>(null);

  const maxUsable = Math.min(availableBalance, maxApplicable);
  const hasBonus = availableBalance > 0;
  const isFullyCovered = appliedAmount >= orderTotal && orderTotal > 0;
  const maxPercentInfo = orderTotal > 0 ? Math.round((maxApplicable / orderTotal) * 100) : 50;

  /**
   * Validate bonus amount
   */
  const validateAmount = React.useCallback(
    (amount: number): ValidationError | null => {
      if (amount > availableBalance) {
        return {
          type: 'INSUFFICIENT_BALANCE',
          message: `Недостаточно бонусов. Доступно: ${formatCurrency(availableBalance)}`,
        };
      }
      if (amount > maxApplicable) {
        return {
          type: 'MAX_EXCEEDED',
          message: `Максимум ${maxPercentInfo}% от заказа можно оплатить бонусами`,
        };
      }
      if (orderTotal > 0 && amount > orderTotal) {
        return {
          type: 'EXCEEDS_ORDER',
          message: 'Сумма бонусов не может превышать стоимость заказа',
        };
      }
      return null;
    },
    [availableBalance, maxApplicable, orderTotal, maxPercentInfo]
  );

  // Sync input with applied amount
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(String(appliedAmount));
    }
  }, [appliedAmount, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setInputValue(value);

    // Real-time validation while typing
    const numValue = parseInt(value, 10) || 0;
    const error = validateAmount(numValue);
    setValidationError(error);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = parseInt(inputValue, 10) || 0;
    const error = validateAmount(numValue);

    if (error) {
      // Clamp to valid value
      const clampedValue = Math.min(Math.max(0, numValue), maxUsable);
      onApply(clampedValue);
      setInputValue(String(clampedValue));
      setValidationError(null);
    } else {
      onApply(numValue);
      setValidationError(null);
    }
  };

  const handleSliderChange = (values: number[]) => {
    const value = values[0];
    setInputValue(String(value));
    setValidationError(null);
    onApply(value);
  };

  const handleQuickApply = (percentage: number) => {
    const value = Math.round((maxUsable * percentage) / 100);
    setValidationError(null);
    onApply(value);
  };

  const handleIncrement = () => {
    const step = 100;
    const newValue = Math.min(appliedAmount + step, maxUsable);
    onApply(newValue);
  };

  const handleDecrement = () => {
    const step = 100;
    const newValue = Math.max(appliedAmount - step, 0);
    onApply(newValue);
  };

  if (!hasBonus) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4',
          className
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mp-surface">
          <Gift className="h-5 w-5 text-mp-text-disabled" />
        </div>
        <div className="space-y-1">
          <span className="block text-sm font-medium text-mp-text-secondary">
            Бонусы недоступны
          </span>
          <span className="block text-xs text-mp-text-disabled">
            У вас пока нет бонусов для использования
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium text-mp-text-primary">
          <Gift className="h-4 w-4 text-mp-accent-secondary" />
          Использовать бонусы
        </Label>
        <span className="text-sm text-mp-text-secondary">
          Доступно: <span className="font-medium text-mp-accent-secondary">{formatCurrency(availableBalance)}</span>
        </span>
      </div>

      {/* Amount input with increment/decrement */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={disabled || appliedAmount <= 0}
          className="shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="relative flex-1">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsEditing(true)}
            onBlur={handleInputBlur}
            disabled={disabled}
            className="pr-10 text-center font-medium"
            placeholder="0"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mp-text-secondary">
            ₽
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={disabled || appliedAmount >= maxUsable}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Slider */}
      <Slider
        value={[appliedAmount]}
        min={0}
        max={maxUsable}
        step={10}
        onValueChange={handleSliderChange}
        disabled={disabled}
        className="py-2"
      />

      {/* Quick apply buttons */}
      <div className="flex gap-2">
        {[25, 50, 75, 100].map((percentage) => (
          <Button
            key={percentage}
            type="button"
            variant={appliedAmount === Math.round((maxUsable * percentage) / 100) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleQuickApply(percentage)}
            disabled={disabled}
            className="flex-1 text-xs"
          >
            {percentage}%
          </Button>
        ))}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-lg bg-mp-error-bg/50 p-3 text-mp-error-text">
          <Warning className="h-4 w-4 shrink-0" />
          <span className="text-sm">{validationError.message}</span>
        </div>
      )}

      {/* Status message */}
      {!validationError && isFullyCovered && (
        <div className="flex items-center gap-2 rounded-lg bg-mp-success-bg/50 p-3 text-mp-success-text">
          <Check className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            Бонусы полностью покрывают стоимость! Оплата не потребуется.
          </span>
        </div>
      )}

      {!validationError && appliedAmount > 0 && !isFullyCovered && (
        <div className="flex items-center gap-2 rounded-lg bg-mp-accent-secondary/10 p-3 text-mp-accent-secondary">
          <WarningCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            Будет списано {formatCurrency(appliedAmount)} бонусов
          </span>
        </div>
      )}

      {/* Expiring bonus warning */}
      {hasExpiringBonuses && appliedAmount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-400 cursor-help">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  Некоторые бонусы истекают в течение 24 часов
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>
                {formatCurrency(expiringAmount)} бонусов истекут в ближайшие 24 часа.
                Рекомендуем использовать их сейчас.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Max applicable info */}
      {orderTotal > 0 && maxPercentInfo < 100 && (
        <p className="text-xs text-mp-text-disabled">
          Максимум {maxPercentInfo}% от заказа можно оплатить бонусами ({formatCurrency(maxApplicable)})
        </p>
      )}
    </div>
  );
}

/**
 * Simple toggle version for compact spaces
 */
interface BonusToggleProps {
  availableBalance: number;
  maxApplicable: number;
  isApplied: boolean;
  onToggle: (apply: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function BonusToggle({
  availableBalance,
  maxApplicable,
  isApplied,
  onToggle,
  disabled = false,
  className,
}: BonusToggleProps) {
  const applicableAmount = Math.min(availableBalance, maxApplicable);

  if (availableBalance <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(!isApplied)}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border p-4 transition-all',
        isApplied
          ? 'border-mp-accent-secondary bg-mp-accent-secondary/10'
          : 'border-mp-border hover:border-mp-border/80 hover:bg-mp-surface/50',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            isApplied
              ? 'bg-mp-accent-secondary/20 text-mp-accent-secondary'
              : 'bg-mp-surface text-mp-text-secondary'
          )}
        >
          <Gift className="h-5 w-5" />
        </div>
        <div className="text-left">
          <span className="block text-sm font-medium text-mp-text-primary">
            {isApplied ? 'Бонусы применены' : 'Использовать бонусы'}
          </span>
          <span className="block text-xs text-mp-text-secondary">
            {isApplied
              ? `−${formatCurrency(applicableAmount)}`
              : `Доступно ${formatCurrency(availableBalance)}`}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
          isApplied
            ? 'border-mp-accent-secondary bg-mp-accent-secondary'
            : 'border-mp-border'
        )}
      >
        {isApplied && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
    </button>
  );
}
