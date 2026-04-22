import { Skeleton } from '@/components/ui/skeleton';

export default function AccountDashboardLoading() {
  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Profile header skeleton */}
      <div className="mb-8 flex items-center gap-4 rounded-xl border border-mp-border bg-mp-surface/30 p-5">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-mp-border p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-mp-border p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-mp-border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
