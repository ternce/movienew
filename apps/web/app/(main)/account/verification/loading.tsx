import { Skeleton } from '@/components/ui/skeleton';

export default function VerificationLoading() {
  return (
    <div className="py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Status card */}
      <Skeleton className="mb-6 h-28 w-full rounded-xl" />

      {/* Step progress */}
      <div className="mb-6 flex items-center justify-between px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Form */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
