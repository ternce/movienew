'use client';

import {
  Calendar,
  CreditCard,
  ArrowsClockwise,
  Clock,
  Check,
  Warning,
} from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { UserSubscription } from '@/types';

import { RenewalToggle } from './renewal-toggle';
import { SubscriptionBadge } from './subscription-badge';

interface SubscriptionDetailsProps {
  subscription: UserSubscription;
  onToggleAutoRenew?: (autoRenew: boolean) => void;
  onCancel?: () => void;
  onUpgrade?: () => void;
  isTogglingAutoRenew?: boolean;
  className?: string;
}

/**
 * Format date in Russian locale
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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
 * Info row component
 */
function InfoRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 text-mp-text-secondary">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={cn('text-sm font-medium text-mp-text-primary', valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function SubscriptionDetails({
  subscription,
  onToggleAutoRenew,
  onCancel,
  onUpgrade,
  isTogglingAutoRenew,
  className,
}: SubscriptionDetailsProps) {
  const { plan, status, startedAt, expiresAt, autoRenew, daysRemaining, cancelledAt } =
    subscription;

  const isActive = status === 'ACTIVE';
  const isExpired = status === 'EXPIRED';
  const isCancelled = status === 'CANCELLED';
  const isExpiringSoon = isActive && daysRemaining <= 7;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <SubscriptionBadge subscription={subscription} showPlanName={false} />
        </div>

        {/* Expiring soon warning */}
        {isExpiringSoon && (
          <div className="flex items-center gap-2 rounded-lg bg-mp-warning-bg/50 p-3 text-mp-warning-text">
            <Warning className="h-4 w-4 shrink-0" />
            <span className="text-sm">
              Подписка истекает через {daysRemaining}{' '}
              {daysRemaining === 1 ? 'день' : 'дней'}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        {/* Subscription info */}
        <div className="space-y-1">
          <InfoRow
            icon={CreditCard}
            label="Стоимость"
            value={`${formatPrice(plan.price, plan.currency)} / мес`}
          />
          <Separator className="opacity-50" />

          <InfoRow
            icon={Calendar}
            label="Дата начала"
            value={formatDate(startedAt)}
          />
          <Separator className="opacity-50" />

          <InfoRow
            icon={Clock}
            label={isExpired || isCancelled ? 'Истекла' : 'Действует до'}
            value={formatDate(expiresAt)}
            valueClassName={isExpiringSoon ? 'text-mp-warning-text' : undefined}
          />

          {cancelledAt && (
            <>
              <Separator className="opacity-50" />
              <InfoRow
                icon={Warning}
                label="Отменена"
                value={formatDate(cancelledAt)}
                valueClassName="text-mp-error-text"
              />
            </>
          )}
        </div>

        <Separator />

        {/* Auto-renewal toggle */}
        {isActive && !isCancelled && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-mp-text-secondary">
              <ArrowsClockwise className="h-4 w-4" />
              <div>
                <span className="text-sm text-mp-text-primary">Автопродление</span>
                <p className="text-xs text-mp-text-secondary">
                  {autoRenew
                    ? 'Подписка продлится автоматически'
                    : 'Подписка завершится по истечении'}
                </p>
              </div>
            </div>
            <RenewalToggle
              autoRenew={autoRenew}
              onToggle={onToggleAutoRenew}
              isLoading={isTogglingAutoRenew}
            />
          </div>
        )}

        {/* Features list */}
        {plan.features.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <span className="text-sm font-medium text-mp-text-primary">
                Включено в план
              </span>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-mp-text-secondary">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mp-accent-primary/20">
                      <Check className="h-2.5 w-2.5 text-mp-accent-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        {isActive && !isCancelled && (
          <>
            {onUpgrade && (
              <Button variant="gradient" className="flex-1" onClick={onUpgrade}>
                Улучшить план
              </Button>
            )}
            {onCancel && (
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Отменить подписку
              </Button>
            )}
          </>
        )}

        {(isExpired || isCancelled) && onUpgrade && (
          <Button variant="gradient" className="w-full" onClick={onUpgrade}>
            Возобновить подписку
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
