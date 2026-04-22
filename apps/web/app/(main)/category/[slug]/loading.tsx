import { VideoCardSkeletonGrid } from '@/components/content';
import { Container } from '@/components/ui/container';

export default function CategoryLoading() {
  return (
    <Container size="full" className="py-6">
      {/* Heading skeleton */}
      <div className="mb-6">
        <div className="h-8 w-36 rounded-lg bg-mp-surface animate-pulse" />
        <div className="h-4 w-52 rounded bg-mp-surface animate-pulse mt-2" />
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-mp-border mb-6">
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 w-16 rounded bg-mp-surface animate-pulse mb-3" />
          ))}
        </div>
      </div>

      <VideoCardSkeletonGrid count={12} variant="series" columns={5} />
    </Container>
  );
}
