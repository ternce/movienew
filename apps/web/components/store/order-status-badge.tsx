'use client';

import { OrderStatus } from '@movie-platform/shared';

import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  [OrderStatus.PENDING]: {
    label: 'Ожидает оплаты',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
  [OrderStatus.PAID]: {
    label: 'Оплачен',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  [OrderStatus.PROCESSING]: {
    label: 'В обработке',
    className: 'bg-mp-accent-primary/15 text-mp-accent-primary border-mp-accent-primary/30',
  },
  [OrderStatus.SHIPPED]: {
    label: 'Отправлен',
    className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Доставлен',
    className: 'bg-mp-success-bg text-mp-success-text border-mp-success-text/30',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Отменён',
    className: 'bg-mp-error-bg text-mp-error-text border-mp-error-text/30',
  },
  [OrderStatus.REFUNDED]: {
    label: 'Возврат',
    className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-mp-surface text-mp-text-secondary border-mp-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
