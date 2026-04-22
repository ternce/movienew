'use client';

import { Check } from '@phosphor-icons/react';

import { OrderStatus } from '@movie-platform/shared';

import { cn } from '@/lib/utils';

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: OrderStatus.PENDING, label: 'Заказ создан' },
  { status: OrderStatus.PAID, label: 'Оплачен' },
  { status: OrderStatus.PROCESSING, label: 'В обработке' },
  { status: OrderStatus.SHIPPED, label: 'Отправлен' },
  { status: OrderStatus.DELIVERED, label: 'Доставлен' },
];

const STATUS_ORDER = TIMELINE_STEPS.map((s) => s.status);

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  className?: string;
}

export function OrderStatusTimeline({ currentStatus, className }: OrderStatusTimelineProps) {
  const isCancelled = currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.REFUNDED;
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  if (isCancelled) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mp-error-bg border-2 border-mp-error-text/50">
            <span className="text-mp-error-text text-xs font-bold">✕</span>
          </div>
          <span className="text-sm font-medium text-mp-error-text">
            {currentStatus === OrderStatus.CANCELLED ? 'Заказ отменён' : 'Возврат средств'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step.status} className="flex items-start gap-3">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors shrink-0',
                  isCompleted && 'bg-mp-accent-primary border-mp-accent-primary',
                  isCurrent && 'border-mp-accent-primary bg-mp-accent-primary/20',
                  isFuture && 'border-mp-border bg-mp-surface',
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : isCurrent ? (
                  <div className="h-2 w-2 rounded-full bg-mp-accent-primary animate-pulse" />
                ) : null}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-6 my-1',
                    isCompleted ? 'bg-mp-accent-primary' : 'bg-mp-border',
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-0.5">
              <span
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-mp-text-primary',
                  isCurrent && 'text-mp-accent-primary',
                  isFuture && 'text-mp-text-disabled',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
