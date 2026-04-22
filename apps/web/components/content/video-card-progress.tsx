'use client';

import { Play } from '@phosphor-icons/react';
import Link from 'next/link';
import { memo } from 'react';

import { ContentImage } from '@/components/content/content-image';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn } from '@/lib/utils';

export interface VideoProgressContent {
  id: string;
  title: string;
  year: number;
  thumbnailUrl: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Duration remaining in minutes */
  remainingMinutes: number;
}

interface VideoCardProgressProps {
  content: VideoProgressContent;
  className?: string;
}

/**
 * Format remaining time
 */
function formatRemainingTime(minutes: number): string {
  if (minutes < 60) {
    return `осталось ${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `осталось ${hours} ч ${mins} мин` : `осталось ${hours} ч`;
}

/**
 * Video card with progress bar matching Figma "Continue Watch" design
 */
export const VideoCardProgress = memo(function VideoCardProgress({ content, className }: VideoCardProgressProps) {
  return (
    <Link
      href={`/watch/${content.id}`}
      className={cn(
        'group block w-[75vw] sm:w-[280px] md:w-[308px] shrink-0',
        className
      )}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-mp-surface mb-3">
        {/* Image */}
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 75vw, 308px"
          fallbackClassName="w-full h-full bg-mp-surface-elevated"
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 touch:w-10 touch:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-mp-bg-primary ml-0.5" weight="fill" />
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <ProgressBar
            value={content.progress}
            size="sm"
            variant="gradient"
            className="rounded-none"
          />
        </div>
      </div>

      {/* Content info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-white truncate group-hover:text-mp-accent-primary transition-colors">
            {content.title}
          </h3>
          <p className="text-sm text-mp-text-secondary">{content.year}</p>
        </div>
        <span className="text-sm text-mp-text-secondary whitespace-nowrap shrink-0">
          {formatRemainingTime(content.remainingMinutes)}
        </span>
      </div>
    </Link>
  );
});
