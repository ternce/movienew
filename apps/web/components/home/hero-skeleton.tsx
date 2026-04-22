import { cn } from '@/lib/utils';

interface HeroSkeletonProps {
  className?: string;
}

export function HeroSkeleton({ className }: HeroSkeletonProps) {
  return (
    <div
      className={cn(
        'relative w-full h-[200px] sm:h-[280px] md:h-[380px] rounded-2xl overflow-hidden animate-pulse bg-mp-surface',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-mp-surface-elevated via-mp-surface to-mp-surface-elevated" />
      <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 space-y-4 max-w-md">
        <div className="h-6 w-24 rounded-lg bg-mp-surface-elevated" />
        <div className="h-4 w-16 rounded bg-mp-surface-elevated" />
        <div className="h-8 w-64 rounded bg-mp-surface-elevated" />
        <div className="h-4 w-12 rounded bg-mp-surface-elevated" />
        <div className="h-4 w-80 rounded bg-mp-surface-elevated hidden sm:block" />
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-32 rounded-lg bg-mp-surface-elevated" />
          <div className="h-10 w-32 rounded-lg bg-mp-surface-elevated" />
        </div>
      </div>
    </div>
  );
}
