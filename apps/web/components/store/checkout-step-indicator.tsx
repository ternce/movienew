'use client';

import { Check } from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'shipping', label: 'Доставка' },
  { id: 'payment', label: 'Оплата' },
  { id: 'review', label: 'Подтверждение' },
  { id: 'complete', label: 'Готово' },
] as const;

const STEP_IDS = STEPS.map((s) => s.id);

interface CheckoutStepIndicatorProps {
  currentStep: string;
  className?: string;
}

export function CheckoutStepIndicator({ currentStep, className }: CheckoutStepIndicatorProps) {
  const currentIndex = STEP_IDS.indexOf(currentStep as (typeof STEP_IDS)[number]);

  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-4', className)}>
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={cn(
                  'h-px w-6 sm:w-10',
                  isPast ? 'bg-mp-accent-primary' : 'bg-mp-border',
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isActive || isPast
                    ? 'bg-mp-accent-primary text-white'
                    : 'bg-mp-surface text-mp-text-secondary',
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'hidden text-sm sm:inline',
                  isActive ? 'text-mp-text-primary font-medium' : 'text-mp-text-secondary',
                )}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
