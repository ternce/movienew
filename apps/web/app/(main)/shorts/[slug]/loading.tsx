import { Container } from '@/components/ui/container';

export default function ShortDetailLoading() {
  return (
    <Container size="lg" className="py-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Vertical video skeleton */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="aspect-[9/16] rounded-2xl bg-mp-surface animate-pulse" />
        </div>

        {/* Info panel skeleton */}
        <div className="flex-1 w-full lg:pt-4 space-y-4">
          <div className="h-8 w-3/4 rounded bg-mp-surface animate-pulse" />
          <div className="h-4 w-32 rounded bg-mp-surface animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-mp-surface animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-mp-surface animate-pulse" />
          </div>
          <div className="flex gap-6">
            <div className="h-4 w-16 rounded bg-mp-surface animate-pulse" />
            <div className="h-4 w-16 rounded bg-mp-surface animate-pulse" />
            <div className="h-4 w-16 rounded bg-mp-surface animate-pulse" />
          </div>
          <div className="flex gap-4 pt-4">
            <div className="h-12 w-40 rounded-xl bg-mp-surface animate-pulse" />
            <div className="h-12 w-36 rounded-xl bg-mp-surface animate-pulse" />
          </div>
        </div>
      </div>

      {/* Related shorts skeleton */}
      <div className="mt-12">
        <div className="h-6 w-40 rounded bg-mp-surface animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-xl bg-mp-surface animate-pulse" />
          ))}
        </div>
      </div>
    </Container>
  );
}
