'use client';

import * as React from 'react';
import { Check, X, SpinnerGap, ArrowClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EncodingStatusBadgeProps {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  availableQualities?: string[];
  onRetry?: () => void;
  className?: string;
}

export function EncodingStatusBadge({
  status,
  progress,
  availableQualities,
  onRetry,
  className,
}: EncodingStatusBadgeProps) {
  switch (status) {
    case 'PENDING':
      return (
        <div className={cn('flex items-center gap-2 text-mp-text-secondary', className)}>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mp-text-disabled opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-mp-text-disabled" />
          </span>
          <span className="text-sm">Ожидание...</span>
        </div>
      );

    case 'PROCESSING':
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <SpinnerGap className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-blue-400">
            Обработка...
            {progress !== undefined && progress > 0 && ` ${progress}%`}
          </span>
          {progress !== undefined && progress > 0 && (
            <div className="flex-1 max-w-32 h-1.5 bg-mp-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      );

    case 'COMPLETED':
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <Check className="w-4 h-4 text-mp-success-text" />
          <span className="text-sm text-mp-success-text">Готово</span>
          {availableQualities && availableQualities.length > 0 && (
            <div className="flex gap-1">
              {availableQualities.map((q) => (
                <span
                  key={q}
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-mp-success-bg text-mp-success-text"
                >
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case 'FAILED':
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <X className="w-4 h-4 text-mp-error-text" />
          <span className="text-sm text-mp-error-text">Ошибка</span>
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-mp-error-text hover:text-mp-error-text"
              onClick={onRetry}
            >
              <ArrowClockwise className="w-3 h-3 mr-1" />
              Повторить
            </Button>
          )}
        </div>
      );

    default:
      return null;
  }
}
