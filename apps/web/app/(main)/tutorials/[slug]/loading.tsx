import { Container } from '@/components/ui/container';

export default function TutorialDetailLoading() {
  return (
    <Container size="lg" className="py-6">
      {/* Hero skeleton */}
      <div className="relative rounded-2xl overflow-hidden bg-mp-surface-2 mb-8">
        <div className="aspect-[21/9] sm:aspect-[3/1] bg-mp-surface animate-pulse" />
      </div>

      {/* CTA skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-56 rounded-xl bg-mp-surface animate-pulse" />
        <div className="h-4 w-64 rounded bg-mp-surface animate-pulse" />
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-mp-border mb-6">
        <div className="flex gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-5 w-16 rounded bg-mp-surface animate-pulse mb-3" />
          ))}
        </div>
      </div>

      {/* Lesson list skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-mp-surface animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-5 w-3/4 rounded bg-mp-surface animate-pulse" />
              <div className="h-3 w-16 rounded bg-mp-surface animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
