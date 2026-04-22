import { SpinnerGap } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <SpinnerGap
      className={cn('animate-spin text-mp-accent-primary', sizeClasses[size], className)}
    />
  );
}

// Full-page spinner overlay
export function SpinnerOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mp-bg-primary/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        {message && (
          <p className="text-sm text-mp-text-secondary animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
}

// Inline spinner for buttons or inline content
export function InlineSpinner({ className }: { className?: string }) {
  return <Spinner size="sm" className={className} />;
}
