'use client';

import { Play } from '@phosphor-icons/react';
import Link from 'next/link';

import { ContentImage } from '@/components/content/content-image';
import { RatingBadge } from '@/components/ui/rating-badge';
import { cn } from '@/lib/utils';

export interface RatedMovieContent {
  id: string;
  title: string;
  year: number;
  thumbnailUrl: string;
  /** Rating (0-10) */
  rating: number;
}

interface MovieCardRatedProps {
  content: RatedMovieContent;
  className?: string;
  /** Whether this is a featured (larger) card */
  featured?: boolean;
}

/**
 * Movie card with professional layered hover effects
 * Features: scale + shadow + gradient overlay + play button reveal
 */
export function MovieCardRated({ content, className, featured = false }: MovieCardRatedProps) {
  return (
    <Link
      href={`/watch/${content.id}`}
      className={cn(
        'group block shrink-0 content-card',
        featured ? 'w-[85vw] sm:w-[380px]' : 'w-[70vw] sm:w-[260px] md:w-[280px]',
        className
      )}
    >
      {/* Thumbnail container with layered hover effects */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        {/* Image with smooth zoom */}
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 70vw, 280px"
          fallbackClassName="w-full h-full bg-mp-surface-elevated"
        />

        {/* Rating badge - more subtle styling */}
        <div className="absolute top-3 left-3 z-10">
          <RatingBadge rating={content.rating} size="default" />
        </div>

        {/* Layered hover effects */}
        {/* 1. Gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* 2. Play button that scales in */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100">
          <div className="w-14 h-14 touch:w-11 touch:h-11 rounded-full bg-mp-accent-primary/90 backdrop-blur-sm flex items-center justify-center shadow-glow-primary">
            <Play className="w-6 h-6 touch:w-5 touch:h-5 text-white ml-0.5" weight="fill" />
          </div>
        </div>
      </div>

      {/* Content info with refined typography */}
      <div>
        <h3 className="font-medium text-mp-text-primary truncate group-hover:text-mp-accent-primary transition-colors duration-200">
          {content.title}
        </h3>
        <p className="text-sm text-mp-text-secondary mt-1">{content.year}</p>
      </div>
    </Link>
  );
}
