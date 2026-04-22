import { cn } from '@/lib/utils';

interface VideoCardSkeletonProps {
  className?: string;
  /** Variant for different card types */
  variant?: 'default' | 'series' | 'episode' | 'tutorial' | 'compact';
}

/**
 * Skeleton loading state for video cards
 * Matches the dimensions and layout of actual cards
 */
export function VideoCardSkeleton({ className, variant = 'default' }: VideoCardSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="aspect-video rounded-lg bg-mp-surface-2 mb-2" />
        <div className="h-4 bg-mp-surface-2 rounded w-3/4 mb-1" />
        <div className="h-3 bg-mp-surface-2 rounded w-1/2" />
      </div>
    );
  }

  if (variant === 'episode') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="aspect-video rounded-xl bg-mp-surface-2 mb-3" />
        <div className="h-4 bg-mp-surface-2 rounded w-4/5 mb-2" />
        <div className="h-3 bg-mp-surface-2 rounded w-full mb-1" />
        <div className="h-3 bg-mp-surface-2 rounded w-2/3" />
      </div>
    );
  }

  if (variant === 'tutorial') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="aspect-video rounded-xl bg-mp-surface-2 mb-3" />
        <div className="h-4 bg-mp-surface-2 rounded w-full mb-2" />
        <div className="h-4 bg-mp-surface-2 rounded w-3/4 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-3 bg-mp-surface-2 rounded w-20" />
          <div className="h-3 bg-mp-surface-2 rounded w-16" />
        </div>
      </div>
    );
  }

  if (variant === 'series') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="aspect-[16/10] rounded-xl bg-mp-surface-2 mb-3" />
        <div className="h-4 bg-mp-surface-2 rounded w-4/5 mb-2" />
        <div className="flex items-center gap-2">
          <div className="h-3 bg-mp-surface-2 rounded w-12" />
          <div className="h-3 bg-mp-surface-2 rounded w-24" />
        </div>
      </div>
    );
  }

  // Default video card skeleton
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="aspect-video rounded-xl bg-mp-surface-2 mb-3" />
      <div className="h-4 bg-mp-surface-2 rounded w-4/5 mb-2" />
      <div className="h-3 bg-mp-surface-2 rounded w-1/3" />
    </div>
  );
}

// Grid of skeletons for loading states
interface SkeletonGridProps {
  count?: number;
  variant?: VideoCardSkeletonProps['variant'];
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function VideoCardSkeletonGrid({
  count = 8,
  variant = 'default',
  className,
  columns = 4,
}: SkeletonGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}

// List variant skeleton
export function VideoCardSkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2 animate-pulse">
          <div className="w-28 aspect-video rounded bg-mp-surface-2 shrink-0" />
          <div className="flex-1 py-0.5">
            <div className="h-4 bg-mp-surface-2 rounded w-3/4 mb-2" />
            <div className="h-3 bg-mp-surface-2 rounded w-1/2 mb-1" />
            <div className="h-3 bg-mp-surface-2 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Horizontal scroll skeleton for carousels
export function VideoCardSkeletonRow({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex gap-4 overflow-hidden', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[280px] md:w-[308px] shrink-0 animate-pulse">
          <div className="aspect-video rounded-xl bg-mp-surface-2 mb-3" />
          <div className="h-4 bg-mp-surface-2 rounded w-4/5 mb-2" />
          <div className="h-3 bg-mp-surface-2 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}
