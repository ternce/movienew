import { Skeleton } from '@/components/ui/skeleton';

export default function SubscriptionsLoading() {
  return (
    <div className="py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="mt-4 h-32 w-full rounded-xl" />
    </div>
  );
}
