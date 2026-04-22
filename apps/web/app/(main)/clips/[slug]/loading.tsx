import { Container } from '@/components/ui/container';

export default function ClipDetailLoading() {
  return (
    <Container size="lg" className="py-6">
      {/* Hero skeleton */}
      <div className="relative rounded-2xl overflow-hidden bg-mp-surface-2 mb-8">
        <div className="aspect-video bg-mp-surface animate-pulse" />
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-6 max-w-3xl">
        <div className="h-4 w-full rounded bg-mp-surface animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-mp-surface animate-pulse" />
      </div>

      {/* Metadata skeleton */}
      <div className="flex gap-4 mb-8">
        <div className="h-4 w-32 rounded bg-mp-surface animate-pulse" />
        <div className="h-4 w-24 rounded bg-mp-surface animate-pulse" />
      </div>

      {/* CTA skeleton */}
      <div className="h-12 w-40 rounded-xl bg-mp-surface animate-pulse mb-12" />

      {/* Related clips skeleton */}
      <div className="h-6 w-40 rounded bg-mp-surface animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-video rounded-xl bg-mp-surface animate-pulse mb-3" />
            <div className="h-4 w-3/4 rounded bg-mp-surface animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-mp-surface animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </Container>
  );
}
