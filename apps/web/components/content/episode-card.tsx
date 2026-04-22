'use client';

import { Play, Clock, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';

import { ContentImage } from '@/components/content/content-image';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn } from '@/lib/utils';

export interface EpisodeContent {
  id: string;
  title: string;
  episodeNumber: number;
  seasonNumber?: number;
  thumbnailUrl: string;
  duration: number; // in minutes
  description?: string;
  /** Watch progress percentage (0-100) */
  progress?: number;
  /** Is this episode watched? */
  isWatched?: boolean;
  /** Is this the next episode to watch? */
  isNext?: boolean;
}

interface EpisodeCardProps {
  content: EpisodeContent;
  seriesSlug: string;
  className?: string;
  /** Display variant */
  variant?: 'default' | 'compact' | 'list';
}

/**
 * Format duration in minutes to readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}ч ${mins}мин` : `${hours}ч`;
}

/**
 * Format episode number with optional season
 */
function formatEpisodeNumber(episode: number, season?: number): string {
  if (season !== undefined) {
    return `S${season}:E${episode}`;
  }
  return `Эпизод ${episode}`;
}

/**
 * Episode card for series detail pages
 */
export function EpisodeCard({ content, seriesSlug, className, variant = 'default' }: EpisodeCardProps) {
  const hasProgress = content.progress !== undefined && content.progress > 0 && content.progress < 100;

  if (variant === 'list') {
    return (
      <EpisodeCardList content={content} seriesSlug={seriesSlug} className={className} />
    );
  }

  if (variant === 'compact') {
    return (
      <EpisodeCardCompact content={content} seriesSlug={seriesSlug} className={className} />
    );
  }

  return (
    <Link
      href={`/watch/${content.id}`}
      className={cn(
        'group block shrink-0 w-full',
        content.isNext && 'ring-2 ring-mp-accent-primary rounded-xl',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          fallbackClassName="w-full h-full bg-mp-surface-elevated"
        />

        {/* Episode number badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-xs bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded font-medium">
            {formatEpisodeNumber(content.episodeNumber, content.seasonNumber)}
          </span>
        </div>

        {/* Duration badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="text-xs bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(content.duration)}
          </span>
        </div>

        {/* Watched indicator */}
        {content.isWatched && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="bg-mp-success-bg/90 backdrop-blur-sm text-mp-success-text p-1.5 rounded-full">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* "Next" indicator */}
        {content.isNext && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="text-xs bg-mp-accent-primary text-white px-2 py-1 rounded font-medium">
              Продолжить
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100">
          <div className="w-12 h-12 touch:w-10 touch:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-mp-bg-primary ml-0.5" weight="fill" />
          </div>
        </div>

        {/* Progress bar */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0">
            <ProgressBar
              value={content.progress!}
              size="sm"
              variant="gradient"
              className="rounded-none"
            />
          </div>
        )}
      </div>

      {/* Content info */}
      <div>
        <h4 className="font-medium text-mp-text-primary line-clamp-1 group-hover:text-mp-accent-primary transition-colors duration-200">
          {content.title}
        </h4>
        {content.description && (
          <p className="text-sm text-mp-text-secondary mt-1 line-clamp-2">
            {content.description}
          </p>
        )}
      </div>
    </Link>
  );
}

// Compact variant for smaller spaces
function EpisodeCardCompact({ content, className }: Omit<EpisodeCardProps, 'variant'>) {
  const hasProgress = content.progress !== undefined && content.progress > 0 && content.progress < 100;

  return (
    <Link
      href={`/watch/${content.id}`}
      className={cn(
        'group block shrink-0 w-full',
        className
      )}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-mp-surface-2 mb-2">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="200px"
          fallbackClassName="w-full h-full bg-mp-surface-elevated"
        />

        {/* Episode number */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">
            {content.episodeNumber}
          </span>
        </div>

        {/* Watched */}
        {content.isWatched && (
          <div className="absolute top-2 right-2">
            <CheckCircle className="w-4 h-4 text-mp-success-text" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-8 h-8 text-white" weight="fill" />
        </div>

        {/* Progress */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0">
            <ProgressBar value={content.progress!} size="xs" variant="gradient" className="rounded-none" />
          </div>
        )}
      </div>

      <h5 className="text-sm font-medium text-mp-text-primary truncate group-hover:text-mp-accent-primary transition-colors">
        {content.title}
      </h5>
      <p className="text-xs text-mp-text-secondary">{formatDuration(content.duration)}</p>
    </Link>
  );
}

// List variant for sidebar or mobile
function EpisodeCardList({ content, className }: Omit<EpisodeCardProps, 'variant'>) {
  const hasProgress = content.progress !== undefined && content.progress > 0 && content.progress < 100;

  return (
    <Link
      href={`/watch/${content.id}`}
      className={cn(
        'group flex gap-3 p-2 rounded-lg hover:bg-mp-surface transition-colors',
        content.isNext && 'bg-mp-accent-primary/10 hover:bg-mp-accent-primary/20',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-28 aspect-video rounded overflow-hidden bg-mp-surface-2 shrink-0">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover"
          sizes="112px"
          fallbackClassName="w-full h-full bg-mp-surface-elevated"
        />

        {/* Episode number overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="text-sm font-bold text-white">{content.episodeNumber}</span>
        </div>

        {/* Watched indicator */}
        {content.isWatched && (
          <div className="absolute top-1 right-1">
            <CheckCircle className="w-4 h-4 text-mp-success-text" />
          </div>
        )}

        {/* Progress */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0">
            <ProgressBar value={content.progress!} size="xs" variant="gradient" className="rounded-none" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h5 className="text-sm font-medium text-mp-text-primary truncate group-hover:text-mp-accent-primary transition-colors">
            {content.title}
          </h5>
          {content.isNext && (
            <span className="text-[10px] bg-mp-accent-primary text-white px-1.5 py-0.5 rounded shrink-0">
              Далее
            </span>
          )}
        </div>
        <p className="text-xs text-mp-text-secondary mt-0.5">
          {formatEpisodeNumber(content.episodeNumber, content.seasonNumber)} • {formatDuration(content.duration)}
        </p>
        {content.description && (
          <p className="text-xs text-mp-text-tertiary mt-1 line-clamp-1">
            {content.description}
          </p>
        )}
      </div>
    </Link>
  );
}
