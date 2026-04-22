import type { AgeCategory } from '@movie-platform/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';


const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-mp-success-bg text-mp-success-text',
        warning:
          'border-transparent bg-mp-warning-bg text-mp-warning-text',
        error:
          'border-transparent bg-mp-error-bg text-mp-error-text',
        // Age category badges
        age0: 'border-transparent bg-age-0/20 text-age-0',
        age6: 'border-transparent bg-age-6/20 text-age-6',
        age12: 'border-transparent bg-age-12/20 text-age-12',
        age16: 'border-transparent bg-age-16/20 text-age-16',
        age18: 'border-transparent bg-age-18/20 text-age-18',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/**
 * Age category badge with automatic styling
 */
interface AgeBadgeProps {
  age: AgeCategory | string;
  className?: string;
}

function AgeBadge({ age, className }: AgeBadgeProps) {
  const getVariant = (ageCategory: string): BadgeProps['variant'] => {
    switch (ageCategory) {
      case '0+':
        return 'age0';
      case '6+':
        return 'age6';
      case '12+':
        return 'age12';
      case '16+':
        return 'age16';
      case '18+':
        return 'age18';
      default:
        return 'secondary';
    }
  };

  return (
    <Badge variant={getVariant(age)} className={className}>
      {age}
    </Badge>
  );
}

/**
 * Status badge for various states
 */
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning';
  label?: string;
  className?: string;
}

function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = {
    active: { variant: 'success' as const, defaultLabel: 'Активен' },
    inactive: { variant: 'secondary' as const, defaultLabel: 'Неактивен' },
    pending: { variant: 'warning' as const, defaultLabel: 'Ожидание' },
    success: { variant: 'success' as const, defaultLabel: 'Успешно' },
    error: { variant: 'error' as const, defaultLabel: 'Ошибка' },
    warning: { variant: 'warning' as const, defaultLabel: 'Внимание' },
  };

  const { variant, defaultLabel } = config[status];

  return (
    <Badge variant={variant} className={className}>
      {label || defaultLabel}
    </Badge>
  );
}

export { Badge, badgeVariants, AgeBadge, StatusBadge };
