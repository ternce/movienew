import { Container } from '@/components/ui/container';

export default function DocumentsLoading() {
  return (
    <Container size="lg" className="py-6">
      {/* Heading skeleton */}
      <div className="mb-8">
        <div className="h-8 w-56 rounded-lg bg-mp-surface animate-pulse" />
        <div className="h-4 w-72 rounded bg-mp-surface animate-pulse mt-2" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-mp-border bg-mp-surface/50 p-6">
            <div className="h-6 w-6 rounded bg-mp-surface animate-pulse mb-4" />
            <div className="h-5 w-3/4 rounded bg-mp-surface animate-pulse mb-2" />
            <div className="h-4 w-full rounded bg-mp-surface animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-mp-surface animate-pulse mt-1" />
          </div>
        ))}
      </div>
    </Container>
  );
}
