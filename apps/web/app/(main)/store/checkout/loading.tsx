import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function CheckoutLoading() {
  return (
    <Container size="lg" className="py-6">
      <Skeleton className="h-8 w-48 mb-4" />
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <Skeleton className="h-px w-10" />}
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-20 hidden sm:block" />
          </div>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </Container>
  );
}
