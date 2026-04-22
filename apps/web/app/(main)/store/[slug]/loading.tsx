import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <Container size="lg" className="py-6">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image skeleton */}
        <Skeleton className="aspect-square rounded-xl" />

        {/* Info skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-12 w-48 mt-6" />
        </div>
      </div>
    </Container>
  );
}
