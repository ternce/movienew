'use client';

import { Check, Crown, Star, Sparkle } from '@phosphor-icons/react';
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
import { cn } from '@/lib/utils';
import type { SubscriptionPlan } from '@/types';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
  onSelect?: (plan: SubscriptionPlan) => void;
  className?: string;
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
 * Format duration in human-readable format
 */
function formatDuration(days: number): string {
  if (days === 30 || days === 31) return 'месяц';
  if (days === 90) return '3 месяца';
  if (days === 180) return '6 месяцев';
  if (days === 365) return 'год';
  return `${days} дней`;
}

/**
 * Get plan icon based on type
 */
function getPlanIcon(type: string) {
  switch (type) {
    case 'PREMIUM':
      return <Crown className="h-6 w-6 text-mp-accent-primary" />;
    case 'CONTENT_SPECIFIC':
      return <Star className="h-6 w-6 text-mp-accent-secondary" />;
    default:
      return <Sparkle className="h-6 w-6 text-mp-accent-tertiary" />;
  }
}

export function PlanCard({
  plan,
  isSelected = false,
  isCurrentPlan = false,
  onSelect,
  className,
}: PlanCardProps) {
  const isPremium = plan.type === 'PREMIUM';

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 cursor-pointer',
        'hover:shadow-card-hover hover:-translate-y-1',
        isSelected && 'ring-2 ring-mp-accent-primary shadow-glow-primary',
        isCurrentPlan && 'ring-2 ring-mp-accent-secondary',
        isPremium && 'border-mp-accent-primary/30',
        className
      )}
      onClick={() => onSelect?.(plan)}
    >
      {/* Premium badge */}
      {isPremium && (
        <div className="absolute -right-8 top-4 rotate-45 bg-mp-accent-primary px-8 py-1 text-xs font-semibold text-white shadow-sm">
          Популярный
        </div>
      )}

      {/* Current plan indicator */}
      {isCurrentPlan && (
        <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-mp-accent-secondary/20 px-2 py-1 text-xs font-medium text-mp-accent-secondary">
          <Check className="h-3 w-3" />
          Текущий план
        </div>
      )}

      <CardHeader className={cn('space-y-2', isCurrentPlan && 'pt-10')}>
        <div className="flex items-center gap-3">
          {getPlanIcon(plan.type)}
          <CardTitle className="text-xl">{plan.name}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-mp-text-primary">
              {formatPrice(plan.price, plan.currency)}
            </span>
            <span className="text-sm text-mp-text-secondary">
              / {formatDuration(plan.durationDays)}
            </span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mp-accent-primary/20">
                <Check className="h-3 w-3 text-mp-accent-primary" />
              </div>
              <span className="text-sm text-mp-text-secondary">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isSelected ? 'glow' : isPremium ? 'gradient' : 'outline'}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan
            ? 'Текущий план'
            : isSelected
              ? 'Выбрано'
              : 'Выбрать план'}
        </Button>
      </CardFooter>
    </Card>
  );
}
