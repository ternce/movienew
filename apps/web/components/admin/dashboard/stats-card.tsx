'use client';

import * as React from 'react';
import type { Icon as IconComponent } from '@phosphor-icons/react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: IconComponent;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

/**
 * Dashboard stats card for displaying metrics
 */
export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-mp-border bg-mp-bg-secondary p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-mp-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-mp-text-primary">{value}</p>
        </div>
        {Icon && (
          <div className="rounded-lg bg-mp-surface p-2.5">
            <Icon className="h-5 w-5 text-mp-accent-primary" />
          </div>
        )}
      </div>

      {(description || trend) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                'flex items-center text-sm font-medium',
                trend.isPositive ? 'text-mp-success-text' : 'text-mp-error-text'
              )}
            >
              {trend.isPositive ? (
                <TrendUp className="mr-1 h-4 w-4" />
              ) : (
                <TrendDown className="mr-1 h-4 w-4" />
              )}
              {trend.value}%
            </span>
          )}
          {description && (
            <span className="text-sm text-mp-text-secondary">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
