import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateTutorialLoading() {
  return (
    <div className="py-8 md:py-12">
      {/* Back button */}
      <Skeleton className="mb-6 h-8 w-36" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            {i > 0 && <div className="h-px flex-1 bg-[#272b38]" />}
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="hidden sm:block h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Step content — Title/Description card */}
      <Card className="border-[#272b38] bg-[#10131c]/50">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Slug */}
          <Skeleton className="h-4 w-40" />
          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}
