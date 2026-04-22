import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Avatar upload area */}
      <div className="mb-6 flex items-center gap-5 rounded-xl border border-mp-border p-5">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Form skeleton */}
      <div className="rounded-xl border border-mp-border p-6 space-y-6">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
