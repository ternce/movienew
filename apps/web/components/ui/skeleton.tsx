import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'rectangular';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        {
          default: 'rounded-md',
          circular: 'rounded-full',
          text: 'rounded h-4',
          rectangular: 'rounded-lg',
        }[variant],
        className
      )}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton components for common use cases
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} />;
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-9 w-24 rounded-md', className)} />;
}

export { Skeleton, SkeletonCard, SkeletonAvatar, SkeletonText, SkeletonButton };
