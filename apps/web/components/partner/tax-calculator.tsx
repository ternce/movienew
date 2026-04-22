'use client';

import { Calculator, Info } from '@phosphor-icons/react';
import * as React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TaxStatus, TaxCalculation } from '@/types';
import { TAX_STATUS_LABELS, TAX_RATES } from '@/stores/partner.store';

interface TaxCalculatorProps {
  amount: number;
  taxStatus: TaxStatus;
  taxCalculation?: TaxCalculation | null;
  isLoading?: boolean;
  onTaxStatusChange: (status: TaxStatus) => void;
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

export function TaxCalculator({
  amount,
  taxStatus,
  taxCalculation,
  isLoading,
  onTaxStatusChange,
  className,
}: TaxCalculatorProps) {
  // Calculate locally if no server calculation available
  const localCalculation = React.useMemo(() => {
    const taxRate = TAX_RATES[taxStatus];
    const taxAmount = Math.round(amount * taxRate);
    const netAmount = amount - taxAmount;
    return { taxRate, taxAmount, netAmount };
  }, [amount, taxStatus]);

  const calculation = taxCalculation || {
    ...localCalculation,
    grossAmount: amount,
    taxStatus,
    explanation: '',
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-mp-accent-primary" />
          Расчёт налога
        </CardTitle>
        <CardDescription>
          Выберите ваш налоговый статус для расчёта суммы к выплате
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tax Status Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="tax-status">Налоговый статус</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-mp-text-secondary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p className="text-sm">
                    Налоговая ставка зависит от вашего статуса. Самозанятые платят 4%,
                    ИП — 6%, физические лица — 13%. Юридические лица уплачивают налог
                    самостоятельно.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={taxStatus}
            onValueChange={(value) => onTaxStatusChange(value as TaxStatus)}
          >
            <SelectTrigger id="tax-status">
              <SelectValue placeholder="Выберите статус" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAX_STATUS_LABELS) as TaxStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {TAX_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calculation Result */}
        {isLoading ? (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : amount > 0 ? (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-mp-text-secondary">Сумма вывода</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-mp-text-secondary">
                Налог ({(calculation.taxRate * 100).toFixed(0)}%)
              </span>
              <span className="text-mp-error-text">
                -{formatCurrency(calculation.taxAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">К выплате</span>
              <span className="text-xl font-bold text-emerald-400">
                {formatCurrency(calculation.netAmount)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-mp-text-secondary pt-2">
            Введите сумму для расчёта налога
          </p>
        )}

        {/* Explanation */}
        {calculation.explanation && (
          <p className="text-xs text-mp-text-secondary bg-mp-surface p-3 rounded-lg">
            {calculation.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
interface TaxPreviewInlineProps {
  amount: number;
  taxStatus: TaxStatus;
  className?: string;
}

export function TaxPreviewInline({
  amount,
  taxStatus,
  className,
}: TaxPreviewInlineProps) {
  const taxRate = TAX_RATES[taxStatus];
  const taxAmount = Math.round(amount * taxRate);
  const netAmount = amount - taxAmount;

  if (amount <= 0) return null;

  return (
    <div className={cn('text-sm', className)}>
      <span className="text-mp-text-secondary">
        К выплате:{' '}
      </span>
      <span className="font-medium text-emerald-400">
        {formatCurrency(netAmount)}
      </span>
      <span className="text-mp-text-secondary ml-1">
        (налог {formatCurrency(taxAmount)})
      </span>
    </div>
  );
}
