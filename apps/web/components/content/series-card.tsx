'use client';

import { Play, Television } from '@phosphor-icons/react';
import Link from 'next/link';
import { memo } from 'react';

import { AgeBadge, type AgeCategory } from '@/components/content/age-badge';
import { ContentImage } from '@/components/content/content-image';
import { RatingBadge } from '@/components/ui/rating-badge';
import { cn } from '@/lib/utils';

export interface SeriesContent {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  seasonCount: number;
  episodeCount: number;
  ageCategory: AgeCategory;
  rating?: number;
  year?: number;
}

interface SeriesCardProps {
  content: SeriesContent;
  className?: string;
}

/**
 * Format season/episode count
 */
function formatSeriesInfo(seasons: number, episodes: number): string {
  const seasonText = seasons === 1 ? '1 сезон' : `${seasons} сезонов`;
  const episodeText = episodes === 1 ? '1 серия' : `${episodes} серий`;
  return `${seasonText} • ${episodeText}`;
}

/**
 * Series card with season/episode count and age badge
 * Features: hover zoom, gradient overlay, play button reveal
 */
export const SeriesCard = memo(function SeriesCard({ content, className }: SeriesCardProps) {
  return (
    <Link
      href={`/series/${content.slug}`}
      className={cn(
        'group block shrink-0 content-card w-full',
        className
      )}
    >
      {/* Thumbnail container with layered hover effects */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        {/* Image with smooth zoom */}
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          fallbackIcon={<Television className="w-12 h-12 text-mp-text-disabled" />}
        />

        {/* Top row badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <AgeBadge age={content.ageCategory} size="sm" />
          {content.rating !== undefined && content.rating > 0 && (
            <RatingBadge rating={content.rating} size="sm" />
          )}
        </div>

        {/* Gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button that scales in */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100">
          <div className="w-14 h-14 touch:w-11 touch:h-11 rounded-full bg-mp-accent-primary/90 backdrop-blur-sm flex items-center justify-center shadow-glow-primary">
            <Play className="w-6 h-6 touch:w-5 touch:h-5 text-white ml-0.5" weight="fill" />
          </div>
        </div>

        {/* Series info badge at bottom (hover-only on desktop) */}
        <div className="absolute bottom-3 left-3 right-3 hidden md:block opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-xs text-white/90 font-medium">
            {formatSeriesInfo(content.seasonCount, content.episodeCount)}
          </span>
        </div>
      </div>

      {/* Content info */}
      <div>
        <h3 className="font-medium text-mp-text-primary truncate group-hover:text-mp-accent-primary transition-colors duration-200">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {content.year && (
            <span className="text-sm text-mp-text-secondary">{content.year}</span>
          )}
          <span className="text-sm text-mp-text-tertiary">
            {formatSeriesInfo(content.seasonCount, content.episodeCount)}
          </span>
        </div>
      </div>
    </Link>
  );
});

// Compact variant for smaller grids
export const SeriesCardCompact = memo(function SeriesCardCompact({ content, className }: SeriesCardProps) {
  return (
    <Link
      href={`/series/${content.slug}`}
      className={cn('group block shrink-0 w-full', className)}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-mp-surface-2 mb-2">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 25vw"
          fallbackIcon={<Television className="w-8 h-8 text-mp-text-disabled" />}
        />

        {/* Age badge only */}
        <div className="absolute top-2 left-2">
          <AgeBadge age={content.ageCategory} size="sm" />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <Play className="w-8 h-8 text-white" weight="fill" />
        </div>
      </div>

      <h4 className="text-sm font-medium text-mp-text-primary truncate group-hover:text-mp-accent-primary transition-colors">
        {content.title}
      </h4>
      <p className="text-xs text-mp-text-secondary mt-0.5">
        {content.seasonCount}с • {content.episodeCount}э
      </p>
    </Link>
  );
});
