import { Container } from '@/components/ui/container';
import { VideoPlayerSkeleton } from '@/components/player';

export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-mp-bg-primary">
      {/* Back navigation bar */}
      <div className="border-b border-mp-border bg-mp-bg-secondary/50 h-14" />

      {/* Video player skeleton */}
      <div className="w-full bg-black">
        <Container size="full" className="px-0 md:px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto">
            <VideoPlayerSkeleton />
          </div>
        </Container>
      </div>

      {/* Content skeleton */}
      <Container size="xl" className="py-6">
        <div className="max-w-4xl animate-pulse space-y-4">
          <div className="h-8 bg-mp-surface rounded-lg w-2/3" />
          <div className="h-4 bg-mp-surface rounded w-1/3" />
          <div className="flex gap-3 pt-4 pb-6 border-b border-mp-border">
            <div className="h-9 w-28 bg-mp-surface rounded-lg" />
            <div className="h-9 w-10 bg-mp-surface rounded-lg" />
            <div className="h-9 w-32 bg-mp-surface rounded-lg" />
          </div>
          <div className="space-y-2 pt-4">
            <div className="h-4 bg-mp-surface rounded w-full" />
            <div className="h-4 bg-mp-surface rounded w-5/6" />
            <div className="h-4 bg-mp-surface rounded w-3/4" />
          </div>
        </div>
      </Container>
    </div>
  );
}
