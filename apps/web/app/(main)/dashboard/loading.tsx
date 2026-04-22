import { HeroSkeleton } from '@/components/home';
import { VideoCardSkeletonRow } from '@/components/content';

/**
 * Loading skeleton for the dashboard page
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero skeleton */}
      <HeroSkeleton />

      {/* Row skeletons */}
      {[1, 2, 3].map((i) => (
        <section key={i} className="space-y-4">
          <div className="flex items-end justify-between">
            <div className="h-6 w-40 bg-mp-surface rounded animate-pulse" />
            <div className="h-4 w-24 bg-mp-surface rounded animate-pulse" />
          </div>
          <VideoCardSkeletonRow count={6} />
        </section>
      ))}
    </div>
  );
}
