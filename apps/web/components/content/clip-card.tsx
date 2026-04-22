'use client';

import { Play, FilmStrip, Eye } from '@phosphor-icons/react';
import Link from 'next/link';

import { AgeBadge, type AgeCategory } from '@/components/content/age-badge';
import { ContentImage } from '@/components/content/content-image';
import { cn, formatDuration, formatNumber } from '@/lib/utils';

export interface ClipContent {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  duration: number; // seconds
  viewCount: number;
  ageCategory: AgeCategory;
  category?: string;
}

interface ClipCardProps {
  content: ClipContent;
  className?: string;
}

/**
 * Clip card with duration badge, view count, and hover play button
 */
export function ClipCard({ content, className }: ClipCardProps) {
  return (
    <Link
      href={`/clips/${content.slug}`}
      className={cn(
        'group block shrink-0 content-card w-full',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          fallbackIcon={<FilmStrip className="w-12 h-12 text-mp-text-disabled" />}
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <AgeBadge age={content.ageCategory} size="sm" />
          {content.category && (
            <span className="text-xs bg-mp-surface/80 backdrop-blur-sm text-mp-text-secondary px-2 py-1 rounded">
              {content.category}
            </span>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="text-xs bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded font-medium">
            {formatDuration(content.duration)}
          </span>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100">
          <div className="w-14 h-14 touch:w-11 touch:h-11 rounded-full bg-mp-accent-tertiary/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 touch:w-5 touch:h-5 text-white ml-0.5" weight="fill" />
          </div>
        </div>
      </div>

      {/* Content info */}
      <div>
        <h3 className="font-medium text-mp-text-primary truncate group-hover:text-mp-accent-tertiary transition-colors duration-200">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-mp-text-secondary">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(content.viewCount)}
          </span>
          <span>&middot;</span>
          <span>{formatDuration(content.duration)}</span>
        </div>
      </div>
    </Link>
  );
}
