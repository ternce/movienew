'use client';

import { useContentList } from '@/hooks/use-content';
import { useContinueWatching } from '@/hooks/use-account';

/**
 * Aggregates data for the authenticated dashboard home page
 */
export function useDashboardHome() {
  const heroContent = useContentList({
    sortBy: 'viewCount',
    limit: 1,
  });

  const continueWatching = useContinueWatching(10);

  const trending = useContentList({
    sortBy: 'viewCount',
    limit: 12,
  });

  const newReleases = useContentList({
    sortBy: 'publishedAt',
    limit: 12,
  });

  const series = useContentList({
    type: 'SERIES',
    limit: 12,
  });

  const tutorials = useContentList({
    type: 'TUTORIAL',
    limit: 12,
  });

  const clips = useContentList({
    type: 'CLIP',
    limit: 12,
  });

  return {
    heroContent,
    continueWatching,
    trending,
    newReleases,
    series,
    tutorials,
    clips,
  };
}
