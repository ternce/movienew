'use client';

import { Play, Heart, ChatCircle, ShareNetwork, ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AgeBadge, type AgeCategory } from '@/components/content/age-badge';
import { ContentImage } from '@/components/content/content-image';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Spinner } from '@/components/ui/spinner';
import { useContentDetail, useContentList } from '@/hooks/use-content';
import { formatNumber } from '@/lib/utils';

export default function ShortDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: short, isLoading } = useContentDetail(slug);
  const { data: relatedData } = useContentList({ type: 'SHORT', limit: 8 });

  const relatedShorts = relatedData?.data?.items?.filter(
    (item) => item.slug !== slug
  ) ?? [];

  if (isLoading) {
    return (
      <Container size="lg" className="py-12 flex justify-center">
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!short) {
    return (
      <Container size="lg" className="py-12 text-center">
        <h2 className="text-xl font-semibold text-mp-text-primary mb-2">Шортс не найден</h2>
        <p className="text-mp-text-secondary mb-6">Запрашиваемое видео не существует или было удалено</p>
        <Button variant="outline" asChild>
          <Link href="/shorts">Все шортсы</Link>
        </Button>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main vertical video container */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Link
            href={`/watch/${short.id}`}
            className="relative block aspect-[9/16] rounded-2xl overflow-hidden bg-black group"
          >
            {short.thumbnailUrl ? (
              <ContentImage
                src={short.thumbnailUrl}
                alt={short.title}
                fill
                className="object-cover"
                sizes="(max-width: 448px) 100vw, 448px"
                priority
              />
            ) : (
              <div className="w-full h-full bg-mp-surface-elevated" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play className="w-8 h-8 text-white ml-1" weight="fill" />
              </div>
            </div>

            {/* Age badge */}
            <div className="absolute top-4 left-4 z-10">
              <AgeBadge age={(short.ageCategory || '0+') as AgeCategory} size="sm" />
            </div>
          </Link>
        </div>

        {/* Info panel */}
        <div className="flex-1 w-full lg:pt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-mp-text-primary mb-3">
            {short.title}
          </h1>

          {short.creator && (
            <p className="text-mp-text-secondary mb-4">
              @{short.creator}
            </p>
          )}

          {short.description && (
            <p className="text-mp-text-secondary mb-6 leading-relaxed">
              {short.description}
            </p>
          )}

          {/* Engagement stats */}
          <div className="flex items-center gap-6 text-sm text-mp-text-secondary mb-8">
            {short.likeCount != null && (
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                {formatNumber(short.likeCount)}
              </span>
            )}
            {short.commentCount != null && (
              <span className="flex items-center gap-1.5">
                <ChatCircle className="w-4 h-4" />
                {formatNumber(short.commentCount)}
              </span>
            )}
            {short.shareCount != null && (
              <span className="flex items-center gap-1.5">
                <ShareNetwork className="w-4 h-4" />
                {formatNumber(short.shareCount)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="gradient" size="lg" asChild>
              <Link href={`/watch/${short.id}`}>
                <Play className="w-5 h-5" />
                Смотреть
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shorts">
                <ArrowLeft className="w-4 h-4" />
                Все шортсы
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Related shorts */}
      {relatedShorts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-mp-text-primary mb-6">
            Другие шортсы
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedShorts.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                href={`/shorts/${item.slug}`}
                className="group block"
              >
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-mp-surface-2">
                  {item.thumbnailUrl ? (
                    <ContentImage
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-mp-surface-elevated" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {item.title}
                    </p>
                    {item.creator && (
                      <p className="text-white/60 text-xs mt-1">@{item.creator}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
