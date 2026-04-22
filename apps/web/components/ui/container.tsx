import * as React from 'react';

import { cn } from '@/lib/utils';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  as?: React.ElementType;
}

const sizeClasses = {
  sm: 'max-w-2xl', // 672px
  md: 'max-w-4xl', // 896px
  lg: 'max-w-6xl', // 1152px
  xl: 'max-w-7xl', // 1280px
  full: 'max-w-full',
};

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', as: Component = 'div', children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Container.displayName = 'Container';

export { Container };
