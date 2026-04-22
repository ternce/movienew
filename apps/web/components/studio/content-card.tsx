'use client';

import { Eye, PencilSimple, ArrowUp } from '@phosphor-icons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentStatusBadge } from './content-status-badge';
import { ContentTypeBadge } from './content-type-badge';
import type { Content } from '@movie-platform/shared';
import { normalizeMediaUrl } from '@/lib/media-url';
import { ContentImage } from '@/components/content/content-image';

interface StudioContentCardProps {
  content: Content;
  onPublish?: (id: string) => void;
  isPublishing?: boolean;
}

/**
 * Content card for the studio dashboard grid
 */
export function StudioContentCard({ content, onPublish, isPublishing }: StudioContentCardProps) {
  const formattedDate = new Date(content.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className="group overflow-hidden border-mp-border bg-mp-surface/50 hover:border-mp-accent-primary/30 transition-colors">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-mp-bg-secondary overflow-hidden">
        {content.thumbnailUrl ? (
          <ContentImage
            src={normalizeMediaUrl(content.thumbnailUrl)}
            alt={content.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-mp-text-disabled text-xs">Нет обложки</span>
          </div>
        )}
        {/* Age badge overlay */}
        <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {content.ageCategory}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold text-mp-text-primary line-clamp-2 flex-1">
            {content.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ContentTypeBadge type={content.contentType} />
          <ContentStatusBadge status={content.status} />
        </div>

        <div className="flex items-center justify-between text-xs text-mp-text-secondary">
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>{content.viewCount.toLocaleString('ru-RU')}</span>
          </div>
          <span>{formattedDate}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/studio/${content.id}`}>
              <PencilSimple className="mr-1.5 h-3.5 w-3.5" />
              Изменить
            </Link>
          </Button>
          {content.status === 'DRAFT' && onPublish && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onPublish(content.id)}
              disabled={isPublishing}
            >
              <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
              Опубликовать
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton for content cards
 */
export function StudioContentCardSkeleton() {
  return (
    <Card className="overflow-hidden border-mp-border bg-mp-surface/50">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </Card>
  );
}
