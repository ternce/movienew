'use client';

import { Check, X, Minus } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SubscriptionPlan } from '@/types';

interface PlanComparisonTableProps {
  plans: SubscriptionPlan[];
  currentPlanId?: string;
  onSelectPlan?: (plan: SubscriptionPlan) => void;
  className?: string;
}

/**
 * Feature comparison data structure
 */
interface FeatureComparison {
  name: string;
  description?: string;
  category: string;
  getValue: (plan: SubscriptionPlan) => boolean | string | number | null;
}

/**
 * Standard comparison features
 */
const COMPARISON_FEATURES: FeatureComparison[] = [
  {
    name: 'Доступ к контенту',
    category: 'Контент',
    getValue: (plan) => (plan.type === 'PREMIUM' ? 'Весь контент' : 'Отдельный контент'),
  },
  {
    name: 'HD качество',
    category: 'Качество',
    getValue: (plan) => plan.type === 'PREMIUM',
  },
  {
    name: '4K качество',
    category: 'Качество',
    getValue: (plan) => plan.type === 'PREMIUM',
  },
  {
    name: 'Без рекламы',
    category: 'Просмотр',
    getValue: (plan) => plan.type === 'PREMIUM',
  },
  {
    name: 'Скачивание',
    category: 'Просмотр',
    getValue: (plan) => plan.type === 'PREMIUM',
  },
  {
    name: 'Приоритетная поддержка',
    category: 'Поддержка',
    getValue: (plan) => plan.type === 'PREMIUM',
  },
];

/**
 * Format price with Russian rubles
 */
function formatPrice(price: number, currency: string = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Render feature value cell
 */
function FeatureValue({ value }: { value: boolean | string | number | null }) {
  if (value === null || value === undefined) {
    return <Minus className="h-5 w-5 text-mp-text-disabled" />;
  }

  if (typeof value === 'boolean') {
    return value ? (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mp-success-bg">
        <Check className="h-4 w-4 text-mp-success-text" />
      </div>
    ) : (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mp-error-bg/50">
        <X className="h-4 w-4 text-mp-error-text/70" />
      </div>
    );
  }

  return <span className="text-sm font-medium text-mp-text-primary">{value}</span>;
}

export function PlanComparisonTable({
  plans,
  currentPlanId,
  onSelectPlan,
  className,
}: PlanComparisonTableProps) {
  // Group features by category
  const categories = React.useMemo(() => {
    const grouped = COMPARISON_FEATURES.reduce(
      (acc, feature) => {
        if (!acc[feature.category]) {
          acc[feature.category] = [];
        }
        acc[feature.category].push(feature);
        return acc;
      },
      {} as Record<string, FeatureComparison[]>
    );
    return Object.entries(grouped);
  }, []);

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[600px] border-collapse">
        {/* Header with plan names */}
        <thead>
          <tr>
            <th className="sticky left-0 bg-mp-bg-primary p-4 text-left">
              <span className="text-lg font-semibold text-mp-text-primary">
                Сравнение планов
              </span>
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                className={cn(
                  'min-w-[180px] p-4 text-center',
                  plan.type === 'PREMIUM' && 'bg-mp-accent-primary/5'
                )}
              >
                <div className="space-y-2">
                  <span className="block text-lg font-semibold text-mp-text-primary">
                    {plan.name}
                  </span>
                  <span className="block text-2xl font-bold text-mp-accent-primary">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="block text-xs text-mp-text-secondary">
                    в месяц
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {categories.map(([category, features]) => (
            <React.Fragment key={category}>
              {/* Category header */}
              <tr>
                <td
                  colSpan={plans.length + 1}
                  className="border-t border-mp-border bg-mp-surface/50 px-4 py-3"
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-mp-text-secondary">
                    {category}
                  </span>
                </td>
              </tr>

              {/* Feature rows */}
              {features.map((feature) => (
                <tr key={feature.name} className="border-t border-mp-border/50">
                  <td className="sticky left-0 bg-mp-bg-primary p-4">
                    <span className="text-sm text-mp-text-primary">{feature.name}</span>
                    {feature.description && (
                      <span className="mt-1 block text-xs text-mp-text-secondary">
                        {feature.description}
                      </span>
                    )}
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan.id}
                      className={cn(
                        'p-4 text-center',
                        plan.type === 'PREMIUM' && 'bg-mp-accent-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-center">
                        <FeatureValue value={feature.getValue(plan)} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}

          {/* Action row */}
          <tr className="border-t border-mp-border">
            <td className="sticky left-0 bg-mp-bg-primary p-4" />
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              return (
                <td
                  key={plan.id}
                  className={cn(
                    'p-4 text-center',
                    plan.type === 'PREMIUM' && 'bg-mp-accent-primary/5'
                  )}
                >
                  <Button
                    variant={plan.type === 'PREMIUM' ? 'gradient' : 'outline'}
                    className="w-full"
                    disabled={isCurrent}
                    onClick={() => onSelectPlan?.(plan)}
                  >
                    {isCurrent ? 'Текущий план' : 'Выбрать'}
                  </Button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
