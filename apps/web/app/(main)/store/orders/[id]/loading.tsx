import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrderDetailLoading() {
  return (
    <Container size="lg" className="py-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </Container>
  );
}
