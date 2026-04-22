'use client';

import { ArrowRight } from '@phosphor-icons/react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PartnerDashboard, LevelProgress } from '@/types';

import { PartnerLevelBadge } from './partner-level-badge';

interface PartnerLevelCardProps {
  dashboard?: PartnerDashboard | null;
  isLoading?: boolean;
  className?: string;
}

export function PartnerLevelCard({
  dashboard,
  isLoading,
  className,
}: PartnerLevelCardProps) {
  if (isLoading) {
    return <PartnerLevelCardSkeleton className={className} />;
  }

  if (!dashboard) {
    return null;
  }

  const { level, levelProgress } = dashboard;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ваш уровень</CardTitle>
          <PartnerLevelBadge level={level} size="lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {levelProgress.nextLevel ? (
          <>
            <div className="flex items-center gap-2 text-sm text-mp-text-secondary">
              <span>До уровня</span>
              <PartnerLevelBadge level={levelProgress.nextLevel} size="sm" />
              <ArrowRight className="h-4 w-4" />
            </div>

            <div className="space-y-3">
              <ProgressItem
                label="Рефералы"
                current={levelProgress.referralsProgress.current}
                required={levelProgress.referralsProgress.required}
                percentage={levelProgress.referralsProgress.percentage}
                unit="чел."
              />
              <ProgressItem
                label="Заработок"
                current={levelProgress.earningsProgress.current}
                required={levelProgress.earningsProgress.required}
                percentage={levelProgress.earningsProgress.percentage}
                unit="₽"
                formatValue={(v) =>
                  new Intl.NumberFormat('ru-RU').format(v)
                }
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-mp-text-secondary">
            Вы достигли максимального уровня партнёрской программы!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Progress item component
 */
interface ProgressItemProps {
  label: string;
  current: number;
  required: number;
  percentage: number;
  unit: string;
  formatValue?: (value: number) => string;
}

function ProgressItem({
  label,
  current,
  required,
  percentage,
  unit,
  formatValue = (v) => v.toString(),
}: ProgressItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-mp-text-secondary">{label}</span>
        <span className="text-mp-text-primary">
          {formatValue(current)} / {formatValue(required)} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-mp-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mp-accent-primary to-mp-accent-secondary transition-all duration-300"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton loader
 */
function PartnerLevelCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
