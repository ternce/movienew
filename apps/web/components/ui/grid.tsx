import * as React from 'react';

import { cn } from '@/lib/utils';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

// Responsive column mapping for content grids
const responsiveColClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
};

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 4, gap = 'md', responsive = true, children, ...props }, ref) => {
    const columnClass = responsive && cols in responsiveColClasses
      ? responsiveColClasses[cols as keyof typeof responsiveColClasses]
      : colClasses[cols];

    return (
      <div
        ref={ref}
        className={cn('grid', columnClass, gapClasses[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Grid.displayName = 'Grid';

// Content grid specifically for video cards with optimized breakpoints
interface ContentGridProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'compact' | 'wide';
}

const ContentGrid = React.forwardRef<HTMLDivElement, ContentGridProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4',
      compact: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3',
      wide: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
    };

    return (
      <div
        ref={ref}
        className={cn('grid', variantClasses[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ContentGrid.displayName = 'ContentGrid';

export { Grid, ContentGrid };
