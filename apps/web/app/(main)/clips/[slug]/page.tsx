'use client';

import { Play, Eye, Clock, FilmStrip } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AgeBadge, type AgeCategory } from '@/components/content/age-badge';
import { ClipCard } from '@/components/content/clip-card';
import { ContentImage } from '@/components/content/content-image';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ContentGrid } from '@/components/ui/grid';
import { Spinner } from '@/components/ui/spinner';
import { useContentDetail, useContentList } from '@/hooks/use-content';
import { formatDuration, formatNumber } from '@/lib/utils';

export default function ClipDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: clip, isLoading } = useContentDetail(slug);
  const { data: relatedData } = useContentList({ type: 'CLIP', limit: 8 });

  const relatedClips = relatedData?.data?.items?.filter(
    (item) => item.slug !== slug
  ) ?? [];

  if (isLoading) {
    return (
      <Container size="lg" className="py-12 flex justify-center">
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!clip) {
    return (
      <Container size="lg" className="py-12 text-center">
        <h2 className="text-xl font-semibold text-mp-text-primary mb-2">Клип не найден</h2>
        <p className="text-mp-text-secondary mb-6">Запрашиваемый клип не существует или был удалён</p>
        <Button variant="outline" asChild>
          <Link href="/clips">Все клипы</Link>
        </Button>
      </Container>
    );
  }

  const categoryName = clip.category
    ? typeof clip.category === 'object'
      ? (clip.category as { name?: string }).name
      : clip.category
    : null;

  return (
    <Container size="lg" className="py-6">
      {/* Hero section */}
      <div className="relative rounded-2xl overflow-hidden bg-mp-surface-2 mb-8">
        <div className="relative aspect-video">
          {clip.thumbnailUrl ? (
            <ContentImage
              src={clip.thumbnailUrl}
              alt={clip.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1152px"
              priority
            />
          ) : (
            <div className="w-full h-full bg-mp-surface-elevated flex items-center justify-center">
              <FilmStrip className="w-20 h-20 text-mp-text-disabled" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <AgeBadge age={(clip.ageCategory || '0+') as AgeCategory} size="md" />
            {categoryName && (
              <span className="text-sm text-white/70 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                {categoryName}
              </span>
            )}
            {clip.duration > 0 && (
              <span className="text-sm text-white/70 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                {formatDuration(clip.duration)}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {clip.title}
          </h1>
        </div>
      </div>

      {/* Description & metadata */}
      {clip.description && (
        <p className="text-mp-text-secondary mb-6 max-w-3xl leading-relaxed">
          {clip.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm text-mp-text-secondary mb-8">
        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" />
          {formatNumber(clip.viewCount)} просмотров
        </span>
        {clip.duration > 0 && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDuration(clip.duration)}
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="mb-12">
        <Button variant="gradient" size="lg" asChild>
          <Link href={`/watch/${clip.id}`}>
            <Play className="w-5 h-5" />
            Смотреть
          </Link>
        </Button>
      </div>

      {/* Related clips */}
      {relatedClips.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-mp-text-primary mb-6">
            Другие клипы
          </h2>
          <ContentGrid>
            {relatedClips.slice(0, 8).map((item) => (
              <ClipCard
                key={item.id}
                content={{
                  id: item.id,
                  slug: item.slug,
                  title: item.title,
                  thumbnailUrl: item.thumbnailUrl,
                  duration: item.duration,
                  viewCount: item.viewCount,
                  ageCategory: item.ageCategory as AgeCategory,
                  category: typeof item.category === 'object' ? item.category?.name : item.category,
                }}
              />
            ))}
          </ContentGrid>
        </section>
      )}
    </Container>
  );
}
