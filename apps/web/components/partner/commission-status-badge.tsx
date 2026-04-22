'use client';

import { Clock, CheckCircle, Wallet, XCircle } from '@phosphor-icons/react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CommissionStatus } from '@/types';

interface CommissionStatusBadgeProps {
  status: CommissionStatus;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Get status configuration
 */
function getStatusConfig(status: CommissionStatus) {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Ожидает',
        variant: 'warning' as const,
        icon: Clock,
        iconColor: 'text-mp-warning-text',
      };
    case 'APPROVED':
      return {
        label: 'Одобрена',
        variant: 'secondary' as const,
        icon: CheckCircle,
        iconColor: 'text-blue-400',
      };
    case 'PAID':
      return {
        label: 'Выплачена',
        variant: 'success' as const,
        icon: Wallet,
        iconColor: 'text-mp-success-text',
      };
    case 'CANCELLED':
      return {
        label: 'Отменена',
        variant: 'error' as const,
        icon: XCircle,
        iconColor: 'text-mp-error-text',
      };
    default:
      return {
        label: status,
        variant: 'secondary' as const,
        icon: Clock,
        iconColor: 'text-mp-text-secondary',
      };
  }
}

const sizeConfig = {
  sm: {
    badge: 'text-xs px-2 py-0.5',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  md: {
    badge: 'text-sm px-2.5 py-1',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
};

export function CommissionStatusBadge({
  status,
  size = 'md',
  className,
}: CommissionStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  return (
    <Badge variant={config.variant} className={cn(sizes.badge, className)}>
      <span className={cn('flex items-center', sizes.gap)}>
        <Icon className={cn(sizes.icon, config.iconColor)} />
        {config.label}
      </span>
    </Badge>
  );
}
