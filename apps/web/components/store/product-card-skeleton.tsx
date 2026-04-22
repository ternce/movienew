'use client';

import { cn } from '@/lib/utils';

interface ProductCardSkeletonProps {
  className?: string;
}

function ProductCardSkeletonSingle({ className }: ProductCardSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="aspect-square rounded-xl bg-mp-surface animate-pulse mb-3" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 rounded bg-mp-surface animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-mp-surface animate-pulse" />
      </div>
    </div>
  );
}

interface ProductCardSkeletonGridProps {
  count?: number;
  columns?: number;
  className?: string;
}

export function ProductCardSkeletonGrid({
  count = 8,
  columns = 4,
  className,
}: ProductCardSkeletonGridProps) {
  const colsClass =
    columns === 3
      ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
      : columns === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={cn('grid gap-4 md:gap-6', colsClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeletonSingle key={i} />
      ))}
    </div>
  );
}

export { ProductCardSkeletonSingle as ProductCardSkeleton };
