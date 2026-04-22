import { Skeleton } from '@/components/ui/skeleton';

export default function WatchlistLoading() {
  return (
    <div className="py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Filter + sort bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
