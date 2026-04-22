import { VideoCardSkeletonGrid } from '@/components/content';
import { Container } from '@/components/ui/container';

export default function ClipsLoading() {
  return (
    <Container size="full" className="py-6">
      {/* Heading skeleton */}
      <div className="mb-6">
        <div className="h-8 w-32 rounded-lg bg-mp-surface animate-pulse" />
        <div className="h-4 w-48 rounded bg-mp-surface animate-pulse mt-2" />
      </div>
      <VideoCardSkeletonGrid count={12} variant="series" columns={5} />
    </Container>
  );
}
