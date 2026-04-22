import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Tab content skeleton */}
      <div className="rounded-xl border border-mp-border p-6 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <Skeleton className="h-5 w-9" />
          </div>
        ))}
      </div>
    </div>
  );
}
