import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const progressBarVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-mp-border',
  {
    variants: {
      size: {
        xs: 'h-0.5',
        sm: 'h-1',
        default: 'h-1.5',
        lg: 'h-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const progressFillVariants = cva(
  'h-full rounded-full transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-mp-accent-primary',
        gradient: 'bg-mp-accent-primary', // Solid color (minimalist design)
        secondary: 'bg-mp-accent-secondary',
        tertiary: 'bg-mp-accent-tertiary',
        success: 'bg-green-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants>,
    VariantProps<typeof progressFillVariants> {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Maximum value (default: 100)
   */
  max?: number;
  /**
   * Show percentage label
   */
  showLabel?: boolean;
}

/**
 * Progress bar component matching Figma design
 */
const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      size,
      variant,
      showLabel = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className={cn('relative', className)} ref={ref} {...props}>
        <div className={cn(progressBarVariants({ size }))}>
          <div
            className={cn(progressFillVariants({ variant }))}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
        {showLabel && (
          <span className="absolute right-0 top-0 -translate-y-full text-xs text-mp-text-secondary mb-1">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);
ProgressBar.displayName = 'ProgressBar';

export { ProgressBar, progressBarVariants, progressFillVariants };
