import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateShortLoading() {
  return (
    <div className="py-8 md:py-12">
      {/* Back button */}
      <Skeleton className="mb-6 h-8 w-36" />

      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — video upload */}
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-44 rounded-lg" />
              <Skeleton className="h-8 w-40 rounded-lg" />
            </div>
            <Skeleton className="aspect-[9/16] max-h-80 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Right — form fields */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-24 w-full" />
          </div>
          {/* Tags */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-9 w-full" />
          </div>
          {/* Age rating */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-12 rounded-lg" />
              ))}
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
