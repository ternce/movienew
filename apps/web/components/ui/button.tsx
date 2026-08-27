import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { SpinnerGap } from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-clip-padding text-sm font-medium outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#d5203a]/45 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'sesh-button',
        destructive:
          'bg-[#8f101f] text-white shadow-[inset_0_0_0_1px_rgba(255,80,96,0.22),0_10px_24px_rgba(0,0,0,0.28)] hover:bg-[#a81428] hover:-translate-y-0.5 active:translate-y-0',
        outline: 'sesh-button-outline',
        secondary: 'sesh-button-secondary',
        ghost: 'sesh-button-ghost',
        link: 'text-[#ff6a78] underline-offset-4 hover:text-[#69bfff] hover:underline',
        gradient: 'sesh-button',
        glow: 'sesh-button',
        // Professional variants
        glass: 'sesh-button-glass',
        pill:
          'sesh-button-secondary rounded-full',
        solid:
          'bg-[#f5f7ff] text-[#07020f] font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.24)] hover:bg-white hover:-translate-y-0.5 active:translate-y-0',
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
  loadingText?: string;
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
      loadingText = 'Загрузка...',
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
            <span>{loadingText}</span>
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
