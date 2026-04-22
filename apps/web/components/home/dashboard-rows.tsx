'use client';

import {
  ContentRow,
  VideoCardProgress,
  MovieCardRated,
  SeriesCard,
  TutorialCard,
  ClipCard,
  type VideoProgressContent,
  type RatedMovieContent,
  type SeriesContent,
  type TutorialContent,
  type ClipContent,
} from '@/components/content';
import type { useDashboardHome } from '@/hooks/use-home';

type DashboardData = ReturnType<typeof useDashboardHome>;

interface DashboardRowsProps {
  data: DashboardData;
}

/** Convert Prisma enum (ZERO_PLUS) or display format (0+) to display format */
const AGE_ENUM_MAP: Record<string, string> = {
  ZERO_PLUS: '0+',
  SIX_PLUS: '6+',
  TWELVE_PLUS: '12+',
  SIXTEEN_PLUS: '16+',
  EIGHTEEN_PLUS: '18+',
};

function normalizeAgeCategory(value: unknown): '0+' | '6+' | '12+' | '16+' | '18+' {
  if (typeof value !== 'string') return '0+';
  if (AGE_ENUM_MAP[value]) return AGE_ENUM_MAP[value] as '0+' | '6+' | '12+' | '16+' | '18+';
  if (['0+', '6+', '12+', '16+', '18+'].includes(value)) return value as '0+' | '6+' | '12+' | '16+' | '18+';
  return '0+';
}

/**
 * All content rows for the authenticated dashboard, connected to real API data.
 */
export function DashboardRows({ data }: DashboardRowsProps) {
  const { continueWatching, trending, newReleases, series, tutorials, clips } = data;

  // Extract items from API response
  const continueItems: VideoProgressContent[] = continueWatching.data?.data?.items || [];
  const trendingItems: RatedMovieContent[] = (trending.data?.data?.items || []).map(mapToRatedContent);
  const newItems: RatedMovieContent[] = (newReleases.data?.data?.items || []).map(mapToRatedContent);
  const seriesItems: SeriesContent[] = (series.data?.data?.items || []).map(mapToSeriesContent);
  const tutorialItems: TutorialContent[] = (tutorials.data?.data?.items || []).map(mapToTutorialContent);
  const clipItems: ClipContent[] = (clips.data?.data?.items || []).map(mapToClipContent);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Continue Watching - only if user has history */}
      {continueItems.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 md:p-6">
        <ContentRow
          title="Продолжить просмотр"
          subtitle={`${continueItems.length} видео`}
          seeAllHref="/account/history"
          isLoading={continueWatching.isLoading}
        >
          {continueItems.map((item) => (
            <VideoCardProgress key={item.id} content={item} />
          ))}
        </ContentRow>
        </div>
      )}

      {/* Trending / Popular */}
      <ContentRow
        title="Популярное"
        seeAllHref="/series"
        isLoading={trending.isLoading}
      >
        {trendingItems.map((item) => (
          <MovieCardRated key={item.id} content={item} />
        ))}
      </ContentRow>

      {/* New Releases */}
      <ContentRow
        title="Новинки"
        seeAllHref="/series"
        isLoading={newReleases.isLoading}
      >
        {newItems.map((item) => (
          <MovieCardRated key={item.id} content={item} />
        ))}
      </ContentRow>

      {/* Series */}
      {(seriesItems.length > 0 || series.isLoading) && (
        <ContentRow
          title="Сериалы"
          seeAllHref="/series"
          isLoading={series.isLoading}
        >
          {seriesItems.map((item) => (
            <SeriesCard key={item.id} content={item} />
          ))}
        </ContentRow>
      )}

      {/* Tutorials */}
      {(tutorialItems.length > 0 || tutorials.isLoading) && (
        <ContentRow
          title="Обучение"
          seeAllHref="/tutorials"
          isLoading={tutorials.isLoading}
        >
          {tutorialItems.map((item) => (
            <TutorialCard key={item.id} content={item} />
          ))}
        </ContentRow>
      )}

      {/* Clips */}
      {(clipItems.length > 0 || clips.isLoading) && (
        <ContentRow
          title="Клипы"
          seeAllHref="/clips"
          isLoading={clips.isLoading}
        >
          {clipItems.map((item) => (
            <ClipCard key={item.id} content={item} />
          ))}
        </ContentRow>
      )}
    </div>
  );
}

// Helper mappers: API response → component props

function mapToRatedContent(item: any): RatedMovieContent {
  return {
    id: item.slug || item.id,
    title: item.title,
    year: item.year || new Date().getFullYear(),
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    rating: item.rating || 0,
  };
}

function mapToSeriesContent(item: any): SeriesContent {
  return {
    id: item.id,
    slug: item.slug || item.id,
    title: item.title,
    year: item.year || new Date().getFullYear(),
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    rating: item.rating || 0,
    seasonCount: item.seasonCount || 1,
    episodeCount: item.episodeCount || 0,
    ageCategory: normalizeAgeCategory(item.ageCategory),
  };
}

function mapToTutorialContent(item: any): TutorialContent {
  return {
    id: item.id,
    slug: item.slug || item.id,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    instructor: item.instructor || item.creator || '',
    lessonCount: item.lessonCount || 0,
    completedLessons: item.completedLessons || 0,
    ageCategory: normalizeAgeCategory(item.ageCategory),
    duration: item.duration ? `${Math.floor(item.duration / 3600)}h ${Math.floor((item.duration % 3600) / 60)}m` : undefined,
  };
}

function mapToClipContent(item: any): ClipContent {
  return {
    id: item.id,
    slug: item.slug || item.id,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    viewCount: item.viewCount || 0,
    duration: item.duration || 0,
    ageCategory: normalizeAgeCategory(item.ageCategory),
  };
}
