'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Play, Plus, ShareNetwork, Calendar } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentGrid } from '@/components/ui/grid';
import {
  AgeBadge,
  ContentImage,
  EpisodeCard,
  VideoCardSkeletonGrid,
  type AgeCategory,
  type EpisodeContent,
} from '@/components/content';
import { RatingBadge } from '@/components/ui/rating-badge';
import { cn, copyTextToClipboard } from '@/lib/utils';
import { useSeriesDetail } from '@/hooks/use-content';
import { useAddToWatchlist } from '@/hooks/use-account';

/**
 * Series detail page — fetches real data from API by slug
 */
export default function SeriesDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: apiData, isLoading, error } = useSeriesDetail(slug);
  const [selectedSeason, setSelectedSeason] = React.useState('1');
  const [showFullDescription, setShowFullDescription] = React.useState(false);
  const addToWatchlist = useAddToWatchlist();

  // Build series object from API response
  const series = React.useMemo(() => {
    const d = (apiData as any)?.data ?? apiData;
    if (!d) return null;
    return {
      id: d.id,
      slug: d.slug,
      title: d.title,
      originalTitle: d.originalTitle,
      description: d.description ?? '',
      thumbnailUrl: d.thumbnailUrl || '/images/movie-placeholder.jpg',
      bannerUrl: d.bannerUrl || d.thumbnailUrl || '/images/movie-placeholder.jpg',
      seasonCount: d.seasonCount ?? d.seasons?.length ?? 0,
      episodeCount:
        d.episodeCount ??
        (d.seasons?.reduce((acc: number, s: { episodes?: unknown[] }) => acc + (s.episodes?.length ?? 0), 0) ?? 0),
      ageCategory: (d.ageCategory ?? '0+') as AgeCategory,
      rating: d.rating,
      year: d.year ?? (d.publishedAt ? new Date(d.publishedAt).getFullYear() : undefined),
      genres: d.genres ?? [],
      country: d.country,
      director: d.director,
      cast: d.cast ?? [],
      seasons: (d.seasons ?? []).map((s: { number: number; title?: string; year?: number; episodes?: EpisodeContent[] }) => ({
        number: s.number,
        title: s.title ?? `Сезон ${s.number}`,
        year: s.year,
        episodes: (s.episodes ?? []) as EpisodeContent[],
      })),
    };
  }, [apiData]);

  // Find next episode to watch
  const nextEpisode = React.useMemo(() => {
    if (!series) return undefined;
    for (const season of series.seasons) {
      const next = season.episodes.find((ep: EpisodeContent) => ep.isNext || (!ep.isWatched && !ep.progress));
      if (next) return next;
    }
    return series.seasons[0]?.episodes[0];
  }, [series]);

  const handleAddToList = React.useCallback(async () => {
    if (!series?.id) return;
    try {
      await addToWatchlist.mutateAsync(series.id);
    } catch {
      // hook shows toast
    }
  }, [addToWatchlist, series?.id]);

  const handleShare = React.useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as any).share({ title: series?.title || 'Сериал', url });
        return;
      }
    } catch {
      // fall back to clipboard
    }

    const ok = await copyTextToClipboard(url);
    if (ok) toast.success('Ссылка скопирована');
    else toast.error('Не удалось скопировать ссылку');
  }, [series?.title]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-[400px] bg-mp-surface-2" />
        <Container size="xl" className="py-8">
          <div className="h-8 bg-mp-surface-2 rounded w-1/3 mb-4" />
          <div className="h-4 bg-mp-surface-2 rounded w-2/3 mb-8" />
          <VideoCardSkeletonGrid count={4} variant="episode" columns={4} />
        </Container>
      </div>
    );
  }

  if (error || !series) {
    return (
      <Container size="xl" className="py-16 text-center">
        <h1 className="text-2xl font-bold text-mp-text-primary mb-4">Сериал не найден</h1>
        <p className="text-mp-text-secondary mb-6">
          Запрашиваемый сериал не существует или был удалён.
        </p>
        <Button asChild>
          <Link href="/series">Вернуться к сериалам</Link>
        </Button>
      </Container>
    );
  }

  return (
    <div>
      {/* Hero banner */}
      <div className="relative h-[400px] md:h-[500px]">
        <ContentImage
          src={series.bannerUrl}
          alt={series.title}
          fill
          className="object-cover"
          priority
          unoptimized={series.bannerUrl.startsWith('http')}
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-mp-bg-primary via-mp-bg-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-mp-bg-primary/80 via-transparent to-transparent" />

        <Container size="xl" className="relative h-full flex items-end pb-8">
          <div className="max-w-2xl">
            {/* Badges */}
            <div className="flex items-center gap-3 mb-4">
              <AgeBadge age={series.ageCategory} size="lg" />
              {series.rating != null && <RatingBadge rating={series.rating} size="lg" />}
              {series.year && (
                <span className="text-sm text-white/80 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {series.year}
                </span>
              )}
              <span className="text-sm text-white/80">
                {series.seasonCount} сезон • {series.episodeCount} серий
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {series.title}
            </h1>
            {series.originalTitle && series.originalTitle !== series.title && (
              <p className="text-lg text-white/60 mb-4">{series.originalTitle}</p>
            )}

            {/* Genres */}
            {series.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {series.genres.map((genre: string) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <p
              className={cn(
                'text-white/80 mb-6',
                !showFullDescription && 'line-clamp-3'
              )}
            >
              {series.description}
            </p>
            {series.description.length > 200 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm text-mp-accent-primary hover:underline mb-6"
              >
                {showFullDescription ? 'Скрыть' : 'Читать далее'}
              </button>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="gradient" size="lg" asChild>
                <Link href={nextEpisode ? `/watch/${nextEpisode.id}` : `/watch/${series.id}`}>
                  <Play className="w-5 h-5 fill-current mr-2" />
                  Смотреть
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleAddToList}
                disabled={addToWatchlist.isPending}
              >
                <Plus className="w-5 h-5 mr-2" />
                В список
              </Button>
              <Button variant="ghost" size="lg" onClick={handleShare}>
                <ShareNetwork className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Seasons and episodes */}
      {series.seasons.length > 0 && (
        <Container size="xl" className="py-8">
          <Tabs value={selectedSeason} onValueChange={setSelectedSeason}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-mp-text-primary">Эпизоды</h2>
              <TabsList>
                {series.seasons.map((season) => (
                  <TabsTrigger key={season.number} value={season.number.toString()}>
                    {season.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {series.seasons.map((season) => (
              <TabsContent key={season.number} value={season.number.toString()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {season.episodes.map((episode: EpisodeContent) => (
                    <EpisodeCard
                      key={episode.id}
                      content={episode}
                      seriesSlug={series.slug}
                    />
                  ))}
                </div>
                {season.episodes.length === 0 && (
                  <p className="text-mp-text-secondary text-center py-8">
                    В этом сезоне пока нет эпизодов
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </Container>
      )}

      {/* No seasons message */}
      {series.seasons.length === 0 && (
        <Container size="xl" className="py-8">
          <p className="text-mp-text-secondary text-center py-8">
            Эпизоды скоро появятся
          </p>
        </Container>
      )}

      {/* Cast & Crew */}
      {(series.director || series.country || series.cast.length > 0) && (
        <Container size="xl" className="pb-8">
          <h2 className="text-xl font-semibold text-mp-text-primary mb-4">
            Создатели
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {series.director && (
              <div className="p-4 bg-mp-surface rounded-xl">
                <p className="text-sm text-mp-text-secondary mb-1">Режиссёр</p>
                <p className="font-medium text-mp-text-primary">{series.director}</p>
              </div>
            )}
            {series.country && (
              <div className="p-4 bg-mp-surface rounded-xl">
                <p className="text-sm text-mp-text-secondary mb-1">Страна</p>
                <p className="font-medium text-mp-text-primary">{series.country}</p>
              </div>
            )}
          </div>

          {series.cast.length > 0 && (
            <>
              <h3 className="text-lg font-medium text-mp-text-primary mt-6 mb-3">В ролях</h3>
              <div className="flex flex-wrap gap-2">
                {series.cast.map((actor: string) => (
                  <span
                    key={actor}
                    className="px-3 py-1.5 bg-mp-surface rounded-lg text-sm text-mp-text-secondary hover:text-mp-text-primary hover:bg-mp-surface-2 transition-colors cursor-pointer"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </>
          )}
        </Container>
      )}
    </div>
  );
}
