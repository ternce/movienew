import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="py-8 md:py-12">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg shrink-0" />
        ))}
      </div>

      {/* Notification items skeleton */}
      <div className="rounded-xl border border-mp-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-mp-border last:border-b-0">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
