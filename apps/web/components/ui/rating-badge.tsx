import { Star } from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface RatingBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Rating value (0-10)
   */
  rating: number;
  /**
   * Show star icon
   */
  showIcon?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'default' | 'lg';
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs gap-0.5',
  default: 'px-2.5 py-1 text-sm gap-1',
  lg: 'px-3 py-1.5 text-base gap-1.5',
};

const iconSizes = {
  sm: 'w-3 h-3',
  default: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

/**
 * Glassmorphic rating badge matching Figma design
 */
const RatingBadge = React.forwardRef<HTMLDivElement, RatingBadgeProps>(
  (
    {
      className,
      rating,
      showIcon = true,
      size = 'default',
      ...props
    },
    ref
  ) => {
    // Format rating to one decimal place
    const formattedRating = rating.toFixed(1);

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-lg backdrop-blur-md bg-white/20 border border-white/10 font-medium text-white',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showIcon && (
          <Star
            className={cn(iconSizes[size], 'text-amber-400')}
            weight="fill"
          />
        )}
        <span>{formattedRating}</span>
      </div>
    );
  }
);
RatingBadge.displayName = 'RatingBadge';

export { RatingBadge };
