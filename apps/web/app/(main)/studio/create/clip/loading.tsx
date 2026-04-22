import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateClipLoading() {
  return (
    <div className="py-8 md:py-12">
      {/* Back button */}
      <Skeleton className="mb-6 h-8 w-36" />

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <Skeleton className="h-px flex-1 min-w-8" />}
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>

      {/* Step 1 content */}
      <div className="space-y-6">
        {/* Title & Description card */}
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Category & Genres card */}
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <div />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}
