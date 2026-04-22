'use client';

import {
  SpinnerGap,
  CheckCircle,
  XCircle,
  WarningCircle,
  Clock,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TransactionStatus } from '@/types';

interface PaymentStatusIndicatorProps {
  status: TransactionStatus;
  transactionId?: string;
  message?: string;
  onRetry?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<
  TransactionStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    color: string;
    bgColor: string;
    animate?: boolean;
  }
> = {
  PENDING: {
    icon: SpinnerGap,
    label: 'Обработка платежа',
    description: 'Пожалуйста, подождите, платёж обрабатывается...',
    color: 'text-mp-accent-primary',
    bgColor: 'bg-mp-accent-primary/10',
    animate: true,
  },
  COMPLETED: {
    icon: CheckCircle,
    label: 'Оплата успешна',
    description: 'Платёж успешно обработан. Спасибо за покупку!',
    color: 'text-mp-success-text',
    bgColor: 'bg-mp-success-bg',
  },
  FAILED: {
    icon: XCircle,
    label: 'Ошибка оплаты',
    description: 'К сожалению, платёж не прошёл. Попробуйте ещё раз.',
    color: 'text-mp-error-text',
    bgColor: 'bg-mp-error-bg',
  },
  CANCELLED: {
    icon: WarningCircle,
    label: 'Платёж отменён',
    description: 'Платёж был отменён по вашему запросу.',
    color: 'text-mp-warning-text',
    bgColor: 'bg-mp-warning-bg',
  },
  REFUNDED: {
    icon: ArrowsClockwise,
    label: 'Возврат выполнен',
    description: 'Средства возвращены на ваш счёт.',
    color: 'text-mp-accent-secondary',
    bgColor: 'bg-mp-accent-secondary/10',
  },
  PARTIALLY_REFUNDED: {
    icon: ArrowsClockwise,
    label: 'Частичный возврат',
    description: 'Часть средств возвращена на ваш счёт.',
    color: 'text-mp-accent-secondary',
    bgColor: 'bg-mp-accent-secondary/10',
  },
};

export function PaymentStatusIndicator({
  status,
  transactionId,
  message,
  onRetry,
  onViewDetails,
  className,
}: PaymentStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className={cn('text-center', className)}>
      {/* Status icon */}
      <div
        className={cn(
          'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full',
          config.bgColor
        )}
      >
        <Icon
          className={cn(
            'h-10 w-10',
            config.color,
            config.animate && 'animate-spin'
          )}
        />
      </div>

      {/* Status text */}
      <div className="mb-6 space-y-2">
        <h2 className="text-xl font-semibold text-mp-text-primary">
          {config.label}
        </h2>
        <p className="text-sm text-mp-text-secondary">
          {message || config.description}
        </p>
      </div>

      {/* Transaction ID */}
      {transactionId && (
        <div className="mb-6 rounded-lg bg-mp-surface p-3">
          <span className="text-xs text-mp-text-disabled">ID транзакции</span>
          <p className="font-mono text-sm text-mp-text-secondary">
            {transactionId}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {status === 'FAILED' && onRetry && (
          <Button variant="gradient" onClick={onRetry}>
            Попробовать снова
          </Button>
        )}

        {onViewDetails && (
          <Button
            variant={status === 'COMPLETED' ? 'gradient' : 'outline'}
            onClick={onViewDetails}
          >
            {status === 'COMPLETED'
              ? 'Перейти к контенту'
              : 'Подробнее'}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact status badge
 */
interface PaymentStatusBadgeProps {
  status: TransactionStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function PaymentStatusBadge({
  status,
  size = 'md',
  className,
}: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizes = {
    sm: {
      wrapper: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      wrapper: 'px-3 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
  };

  const sizeConfig = sizes[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        config.bgColor,
        sizeConfig.wrapper,
        className
      )}
    >
      <Icon
        className={cn(
          sizeConfig.icon,
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <span className={cn('font-medium', config.color, sizeConfig.text)}>
        {config.label}
      </span>
    </div>
  );
}

/**
 * Inline status with polling indicator
 */
interface PaymentStatusPollingProps {
  status: TransactionStatus;
  isPolling?: boolean;
  className?: string;
}

export function PaymentStatusPolling({
  status,
  isPolling = false,
  className,
}: PaymentStatusPollingProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg p-4',
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5',
          config.color,
          (config.animate || isPolling) && 'animate-spin'
        )}
      />
      <div className="flex-1">
        <p className={cn('font-medium', config.color)}>{config.label}</p>
        {isPolling && status === 'PENDING' && (
          <p className="text-xs text-mp-text-secondary">
            Проверяем статус оплаты...
          </p>
        )}
      </div>

      {isPolling && (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-mp-text-disabled" />
          <span className="text-xs text-mp-text-disabled">Ожидание</span>
        </div>
      )}
    </div>
  );
}
