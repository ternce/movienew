'use client';

import { DashboardHero, DashboardRows } from '@/components/home';
import { useDashboardHome } from '@/hooks/use-home';
import type { HeroContent } from '@/components/content';

/**
 * Authenticated dashboard — real API data with content rows
 */
export default function DashboardPage() {
  const data = useDashboardHome();

  // Map first trending item to hero content format
  const heroItem = data.heroContent.data?.data?.items?.[0];
  const heroContent: HeroContent | null = heroItem
    ? {
        id: heroItem.slug || heroItem.id,
        title: heroItem.title,
        year: heroItem.year || new Date().getFullYear(),
        genre: (typeof heroItem.category === 'object' && heroItem.category !== null) ? heroItem.category.name || '' : heroItem.category || '',
        description: '',
        thumbnailUrl: heroItem.thumbnailUrl || '/images/movie-placeholder.jpg',
        rank: 1,
      }
    : null;

  return (
    <div className="space-y-6 md:space-y-8">
      <DashboardHero
        content={heroContent}
        isLoading={data.heroContent.isLoading}
      />
      <DashboardRows data={data} />
    </div>
  );
}
