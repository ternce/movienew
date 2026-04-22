'use client';

import { Crown, Clock, Warning, XCircle } from '@phosphor-icons/react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SubscriptionStatus, UserSubscription } from '@/types';

interface SubscriptionBadgeProps {
  subscription?: UserSubscription | null;
  showPlanName?: boolean;
  showExpiry?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Get status configuration
 */
function getStatusConfig(status: SubscriptionStatus) {
  switch (status) {
    case 'ACTIVE':
      return {
        variant: 'success' as const,
        label: 'Активна',
        icon: Crown,
        iconColor: 'text-mp-success-text',
      };
    case 'PENDING':
      return {
        variant: 'warning' as const,
        label: 'Ожидает',
        icon: Clock,
        iconColor: 'text-mp-warning-text',
      };
    case 'EXPIRED':
      return {
        variant: 'error' as const,
        label: 'Истекла',
        icon: Warning,
        iconColor: 'text-mp-error-text',
      };
    case 'CANCELLED':
      return {
        variant: 'secondary' as const,
        label: 'Отменена',
        icon: XCircle,
        iconColor: 'text-mp-text-secondary',
      };
    default:
      return {
        variant: 'secondary' as const,
        label: status,
        icon: Clock,
        iconColor: 'text-mp-text-secondary',
      };
  }
}

/**
 * Format expiry date
 */
function formatExpiry(expiresAt: string, daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return 'Истекла';
  }
  if (daysRemaining === 1) {
    return 'Истекает завтра';
  }
  if (daysRemaining <= 7) {
    return `Истекает через ${daysRemaining} дн.`;
  }

  const date = new Date(expiresAt);
  return `до ${date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })}`;
}

/**
 * Size configurations
 */
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
  lg: {
    badge: 'text-base px-3 py-1.5',
    icon: 'h-5 w-5',
    gap: 'gap-2',
  },
};

export function SubscriptionBadge({
  subscription,
  showPlanName = true,
  showExpiry = false,
  size = 'md',
  className,
}: SubscriptionBadgeProps) {
  // No subscription - show free badge
  if (!subscription) {
    return (
      <Badge variant="secondary" className={cn(sizeConfig[size].badge, className)}>
        <span className={cn('flex items-center', sizeConfig[size].gap)}>
          Бесплатный план
        </span>
      </Badge>
    );
  }

  const config = getStatusConfig(subscription.status);
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  return (
    <Badge variant={config.variant} className={cn(sizes.badge, className)}>
      <span className={cn('flex items-center', sizes.gap)}>
        <Icon className={cn(sizes.icon, config.iconColor)} />
        <span>
          {showPlanName && subscription.plan ? (
            <>
              {subscription.plan.name}
              {subscription.status !== 'ACTIVE' && ` (${config.label})`}
            </>
          ) : (
            config.label
          )}
        </span>
        {showExpiry && subscription.status === 'ACTIVE' && (
          <span className="ml-1 opacity-80">
            {formatExpiry(subscription.expiresAt, subscription.daysRemaining)}
          </span>
        )}
      </span>
    </Badge>
  );
}

/**
 * Simple status-only badge
 */
interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SubscriptionStatusBadge({
  status,
  size = 'md',
  className,
}: SubscriptionStatusBadgeProps) {
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
