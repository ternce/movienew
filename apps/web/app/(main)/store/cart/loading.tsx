import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function CartLoading() {
  return (
    <Container size="lg" className="py-6">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-mp-border">
              <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </Container>
  );
}
