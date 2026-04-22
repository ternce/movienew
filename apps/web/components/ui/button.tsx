import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { SpinnerGap } from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:-translate-y-0.5 active:translate-y-0',
        outline:
          'border border-mp-border bg-transparent shadow-sm hover:bg-mp-surface-3 hover:border-mp-border/80',
        secondary:
          'bg-mp-surface-3 text-mp-text-primary border border-mp-border/50 hover:bg-mp-surface-4 hover:border-mp-border',
        ghost: 'text-mp-text-secondary hover:text-mp-text-primary hover:bg-white/5',
        link: 'text-primary underline-offset-4 hover:underline',
        // MoviePlatform custom variants - Professional with subtle lift
        gradient:
          'bg-mp-accent-primary text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5 active:translate-y-0',
        glow: 'bg-mp-accent-primary text-white shadow-glow-primary hover:shadow-glow-secondary hover:-translate-y-0.5 active:translate-y-0',
        // Professional variants
        glass:
          'backdrop-blur-md bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20',
        pill:
          'rounded-full bg-mp-surface-2 text-mp-text-secondary border border-mp-border/30 hover:bg-mp-surface-3 hover:text-mp-text-primary hover:border-mp-border/50',
        solid:
          'bg-white text-mp-bg-primary font-semibold shadow-sm hover:bg-white/95 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
        'icon-touch': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild && !isLoading ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <SpinnerGap className="animate-spin" />
            <span>Loading...</span>
          </>
        ) : asChild ? (
          <Slottable>{children}</Slottable>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
