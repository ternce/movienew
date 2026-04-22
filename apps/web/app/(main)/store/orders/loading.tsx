import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <Container size="lg" className="py-6">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </Container>
  );
}
