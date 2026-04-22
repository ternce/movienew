'use client';

import { BookOpen, Play, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';

import { AgeBadge, type AgeCategory } from '@/components/content/age-badge';
import { ContentImage } from '@/components/content/content-image';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn } from '@/lib/utils';

export interface TutorialContent {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  lessonCount: number;
  completedLessons: number;
  ageCategory: AgeCategory;
  category?: string;
  duration?: string; // e.g., "4h 30m"
  instructor?: string;
}

interface TutorialCardProps {
  content: TutorialContent;
  className?: string;
}

/**
 * Calculate progress percentage
 */
function getProgressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Tutorial card with lesson progress
 * Features: progress bar, lesson count, category badge
 */
export function TutorialCard({ content, className }: TutorialCardProps) {
  const progress = getProgressPercent(content.completedLessons, content.lessonCount);
  const isComplete = progress === 100;

  return (
    <Link
      href={`/tutorials/${content.slug}`}
      className={cn(
        'group block shrink-0 content-card w-full',
        className
      )}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        {/* Image with smooth zoom */}
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          fallbackIcon={<BookOpen className="w-12 h-12 text-mp-text-disabled" />}
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

        {/* Completion badge */}
        {isComplete && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="flex items-center gap-1 bg-mp-success-bg/90 backdrop-blur-sm text-mp-success-text px-2 py-1 rounded text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Завершено
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100">
          <div className="w-14 h-14 touch:w-11 touch:h-11 rounded-full bg-mp-accent-secondary/90 backdrop-blur-sm flex items-center justify-center shadow-glow-secondary">
            <Play className="w-6 h-6 touch:w-5 touch:h-5 text-white ml-0.5" weight="fill" />
          </div>
        </div>

        {/* Progress bar at bottom */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <ProgressBar
              value={progress}
              size="sm"
              variant={isComplete ? 'success' : 'default'}
              className="rounded-none"
            />
          </div>
        )}
      </div>

      {/* Content info */}
      <div>
        <h3 className="font-medium text-mp-text-primary line-clamp-2 group-hover:text-mp-accent-secondary transition-colors duration-200">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-sm text-mp-text-secondary">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {content.completedLessons}/{content.lessonCount} уроков
          </span>
          {content.duration && (
            <>
              <span>•</span>
              <span>{content.duration}</span>
            </>
          )}
        </div>
        {content.instructor && (
          <p className="text-sm text-mp-text-tertiary mt-1">{content.instructor}</p>
        )}
      </div>
    </Link>
  );
}

// In-progress tutorial card for dashboard
export function TutorialCardProgress({ content, className }: TutorialCardProps) {
  const progress = getProgressPercent(content.completedLessons, content.lessonCount);

  return (
    <Link
      href={`/tutorials/${content.slug}`}
      className={cn(
        'group flex gap-4 p-3 rounded-xl bg-mp-surface hover:bg-mp-surface-2 transition-colors',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-mp-surface-2 shrink-0">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover"
          sizes="128px"
          fallbackIcon={<BookOpen className="w-6 h-6 text-mp-text-disabled" />}
        />

        {/* Hover play */}
        <div className="absolute inset-0 bg-black/40 touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-6 h-6 text-white" weight="fill" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-mp-text-primary truncate group-hover:text-mp-accent-secondary transition-colors">
          {content.title}
        </h4>
        <p className="text-sm text-mp-text-secondary mt-1">
          {content.completedLessons} из {content.lessonCount} уроков
        </p>
        <div className="mt-2">
          <ProgressBar value={progress} size="sm" />
        </div>
      </div>
    </Link>
  );
}
